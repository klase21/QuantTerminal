"use client"

export type SharedWsStatus = "connecting" | "open" | "closed" | "error"

type JsonHandler = (payload: any, event: MessageEvent) => void
type StatusHandler = (status: SharedWsStatus, meta?: { url: string; error?: unknown }) => void

interface StreamEntry {
  url: string
  ws: WebSocket | null
  subscribers: Map<number, { onJson: JsonHandler; onStatus?: StatusHandler }>
  nextId: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  closeTimer: ReturnType<typeof setTimeout> | null
  reconnectAttempt: number
  closedByManager: boolean
  connecting: boolean
}

const streams = new Map<string, StreamEntry>()

function isBrowser() {
  return typeof window !== "undefined" && typeof WebSocket !== "undefined"
}

function notify(entry: StreamEntry, status: SharedWsStatus, error?: unknown) {
  entry.subscribers.forEach((subscriber) => {
    subscriber.onStatus?.(status, { url: entry.url, error })
  })
}

function cleanupSocket(entry: StreamEntry) {
  const ws = entry.ws
  if (!ws) return
  ws.onopen = null
  ws.onmessage = null
  ws.onerror = null
  ws.onclose = null
  entry.ws = null
  entry.connecting = false
}

function closeSocket(entry: StreamEntry) {
  const ws = entry.ws
  cleanupSocket(entry)
  if (!ws) return
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      entry.closedByManager = true
      ws.close(1000, "Shared stream unused")
    }
  } catch {
    // noop
  }
}

function scheduleReconnect(entry: StreamEntry) {
  if (entry.subscribers.size === 0) return
  if (entry.reconnectTimer) return

  const delay = Math.min(30000, 1000 * Math.pow(1.6, entry.reconnectAttempt++))
  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null
    connect(entry)
  }, delay)
}

function connect(entry: StreamEntry) {
  if (!isBrowser()) return
  if (entry.subscribers.size === 0) return
  if (entry.connecting) return
  if (entry.ws && (entry.ws.readyState === WebSocket.OPEN || entry.ws.readyState === WebSocket.CONNECTING)) return

  entry.connecting = true
  entry.closedByManager = false
  notify(entry, "connecting")
  if (process.env.NODE_ENV !== "production") {
    console.debug("QT WS CONNECTING", entry.url)
  }

  let ws: WebSocket
  try {
    ws = new WebSocket(entry.url)
  } catch (error) {
    entry.connecting = false
    notify(entry, "error", error)
    scheduleReconnect(entry)
    return
  }

  entry.ws = ws

  ws.onopen = () => {
    entry.connecting = false
    entry.reconnectAttempt = 0
    notify(entry, "open")
    if (process.env.NODE_ENV !== "production") {
      console.debug("QT WS OPEN", entry.url)
    }
  }

  ws.onmessage = (event) => {
    let payload: any
    try {
      payload = JSON.parse(event.data)
    } catch {
      return
    }

    entry.subscribers.forEach((subscriber) => {
      subscriber.onJson(payload, event)
    })
  }

  ws.onerror = (error) => {
    notify(entry, "error", error)
    if (process.env.NODE_ENV !== "production") {
      console.warn("QT WS ERROR", entry.url, error)
    }
    // Closing funnels all reconnect/backoff logic through onclose.
    try {
      ws.close()
    } catch {
      // noop
    }
  }

  ws.onclose = () => {
    entry.connecting = false
    cleanupSocket(entry)
    notify(entry, "closed")
    if (process.env.NODE_ENV !== "production") {
      console.debug("QT WS CLOSED", entry.url)
    }

    if (!entry.closedByManager && entry.subscribers.size > 0) {
      scheduleReconnect(entry)
    }
  }
}

export function subscribeJsonStream(
  url: string,
  onJson: JsonHandler,
  onStatus?: StatusHandler,
) {
  let entry = streams.get(url)

  if (!entry) {
    entry = {
      url,
      ws: null,
      subscribers: new Map(),
      nextId: 1,
      reconnectTimer: null,
      closeTimer: null,
      reconnectAttempt: 0,
      closedByManager: false,
      connecting: false,
    }
    streams.set(url, entry)
  }

  if (entry.closeTimer) {
    clearTimeout(entry.closeTimer)
    entry.closeTimer = null
  }

  const id = entry.nextId++
  entry.subscribers.set(id, { onJson, onStatus })
  connect(entry)

  return () => {
    const current = streams.get(url)
    if (!current) return

    current.subscribers.delete(id)

    if (current.subscribers.size === 0) {
      if (current.reconnectTimer) {
        clearTimeout(current.reconnectTimer)
        current.reconnectTimer = null
      }

      // React StrictMode mounts/unmounts/remounts immediately in development.
      // Delaying teardown prevents "closed before the connection is established"
      // races while still releasing unused sockets shortly after.
      current.closeTimer = setTimeout(() => {
        const latest = streams.get(url)
        if (!latest || latest.subscribers.size > 0) return
        closeSocket(latest)
        streams.delete(url)
      }, 2500)
    }
  }
}

export function getSharedWsDebugSnapshot() {
  return Array.from(streams.values()).map((entry) => ({
    url: entry.url,
    subscribers: entry.subscribers.size,
    readyState: entry.ws?.readyState ?? null,
    reconnectAttempt: entry.reconnectAttempt,
  }))
}
