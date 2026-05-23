"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { buildRealMarketRotation, type BinanceTicker24h, type UpbitTicker } from "@/core/market/realMarketRotation"
import type { ConnectorQualityStatus, RealMarketRotationResponse } from "@/core/marketDataTypes"
import { getRegistryBinanceSpotSymbols } from "@/core/stream/streamSymbols"
import {
  miniTickerToBinance24h,
  type BinanceMiniTickerMessage,
  type UpbitTickerMessage,
  upbitStreamToTicker,
} from "@/core/stream/streamTickerAdapters"
import { safeFetchJson } from "@/lib/runtime/safeFetch"

export type SectorRotationFeedStatus = "idle" | "loading" | "live" | "partial" | "error"
export type RealtimeTransportStatus = "idle" | "connecting" | "connected" | "stale" | "error"

const DEFAULT_POLL_MS = 60000
const BINANCE_MINI_TICKER_WS = "wss://stream.binance.com:9443/ws/!miniTicker@arr"
const UPBIT_WS_URL = "wss://api.upbit.com/websocket/v1"
const STREAM_REBUILD_THROTTLE_MS = 900
const STALE_AFTER_MS = 15000

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === "AbortError"
}

function nowIso() {
  return new Date().toISOString()
}

function baseSymbolFromTickerSymbol(symbol: string) {
  return symbol.replace(/USDT$/, "").toUpperCase()
}

function buildKrwCodesFromSeed(seed: RealMarketRotationResponse | null) {
  const codes = new Set<string>()
  for (const asset of seed?.assets ?? []) {
    if (asset.source === "upbit" || asset.source === "merged" || asset.upbitKrwVolume24h) {
      codes.add(`KRW-${asset.symbol.toUpperCase()}`)
    }
  }
  return [...codes].slice(0, 120)
}

async function decodeUpbitMessage(data: MessageEvent["data"]): Promise<UpbitTickerMessage | null> {
  try {
    if (typeof data === "string") return JSON.parse(data) as UpbitTickerMessage
    if (data instanceof Blob) return JSON.parse(await data.text()) as UpbitTickerMessage
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data)) as UpbitTickerMessage
  } catch {
    return null
  }
  return null
}

function mergeSeedConnectors(seed: RealMarketRotationResponse | null, streamConnectors: ConnectorQualityStatus[]) {
  const seedConnectors = seed?.dataQuality?.connectors ?? []
  const keepSeed = seedConnectors.filter((connector) =>
    connector.name === "datalab" ||
    connector.name === "binance-exchange-info" ||
    connector.name === "upbit-markets"
  )
  return [...streamConnectors, ...keepSeed]
}

function deriveStatus(payload: RealMarketRotationResponse): SectorRotationFeedStatus {
  if (payload.ok === false) return "error"
  if (payload.mode === "partial" || payload.dataQuality?.status === "partial") return "partial"
  return "live"
}

export function useSectorRotationFeed(pollMs = DEFAULT_POLL_MS) {
  const [data, setData] = useState<RealMarketRotationResponse | null>(null)
  const [status, setStatus] = useState<SectorRotationFeedStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const [binanceWsStatus, setBinanceWsStatus] = useState<RealtimeTransportStatus>("idle")
  const [upbitWsStatus, setUpbitWsStatus] = useState<RealtimeTransportStatus>("idle")
  const [upbitSubscriptionCodes, setUpbitSubscriptionCodes] = useState<string[]>([])

  const binanceWsStatusRef = useRef<RealtimeTransportStatus>("idle")
  const upbitWsStatusRef = useRef<RealtimeTransportStatus>("idle")

  const setBinanceTransportStatus = useCallback((next: RealtimeTransportStatus) => {
    binanceWsStatusRef.current = next
    setBinanceWsStatus(next)
  }, [])

  const setUpbitTransportStatus = useCallback((next: RealtimeTransportStatus) => {
    upbitWsStatusRef.current = next
    setUpbitWsStatus(next)
  }, [])

  const seedRef = useRef<RealMarketRotationResponse | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const binanceMapRef = useRef<Map<string, BinanceTicker24h>>(new Map())
  const upbitMapRef = useRef<Map<string, UpbitTicker>>(new Map())
  const lastBinanceMessageAtRef = useRef<number | null>(null)
  const lastUpbitMessageAtRef = useRef<number | null>(null)
  const scheduledRebuildRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const upbitCodesRef = useRef<string[]>([])

  const binanceSymbolSet = useMemo(() => new Set(getRegistryBinanceSpotSymbols()), [])

  const publishStreamSnapshot = useCallback(() => {
    scheduledRebuildRef.current = null

    const binanceTickers = [...binanceMapRef.current.values()]
    if (!binanceTickers.length) return

    const streamConnectors: ConnectorQualityStatus[] = [
      {
        name: "binance-ws",
        status: binanceWsStatusRef.current === "connected" ? "connected" : binanceWsStatusRef.current === "error" ? "error" : "partial",
        records: binanceTickers.length,
        message: "Binance !miniTicker websocket stream",
      },
      {
        name: "upbit-ws",
        status: upbitMapRef.current.size
          ? "connected"
          : upbitWsStatusRef.current === "error"
            ? "error"
            : upbitCodesRef.current.length
              ? "partial"
              : "idle",
        records: upbitMapRef.current.size,
        message: upbitCodesRef.current.length ? "Upbit KRW ticker websocket overlay" : "No validated KRW markets in seed snapshot yet",
      },
    ]

    const built = buildRealMarketRotation({
      binanceTickers,
      upbitTickers: [...upbitMapRef.current.values()],
      premium: null,
      updatedAt: nowIso(),
      connectorQuality: mergeSeedConnectors(seedRef.current, streamConnectors),
    })

    const snapshot: RealMarketRotationResponse = {
      ...built,
      source: "binance-upbit-websocket-market",
      endpoints: {
        ...built.endpoints,
        binanceMiniTickerWs: BINANCE_MINI_TICKER_WS,
        upbitTickerWs: UPBIT_WS_URL,
        pollingFallback: "/api/market/sector-rotation",
      },
      notes: [
        ...built.notes,
        "Realtime websocket mode is active. Polling route remains as fallback and seed source.",
      ],
    }

    seedRef.current = snapshot
    setData(snapshot)
    setStatus(deriveStatus(snapshot))
    setError(null)
    setPulse((value) => value + 1)
  }, [])

  const scheduleStreamRebuild = useCallback(() => {
    if (scheduledRebuildRef.current) return
    scheduledRebuildRef.current = setTimeout(publishStreamSnapshot, STREAM_REBUILD_THROTTLE_MS)
  }, [publishStreamSnapshot])

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!seedRef.current) setStatus("loading")

      try {
        const result = await safeFetchJson<RealMarketRotationResponse>("/api/market/sector-rotation", {
          signal: controller.signal,
          timeoutMs: 9000,
          retries: 1,
          label: "sector rotation",
        })
        if (!alive) return

        if (!result.ok || !result.data || result.data.ok === false) {
          throw new Error(result.error ?? result.data?.notes?.[0] ?? "sector rotation failed")
        }
        const payload = result.data

        seedRef.current = payload
        const nextUpbitCodes = buildKrwCodesFromSeed(payload)
        setUpbitSubscriptionCodes((current) => (
          current.join(",") === nextUpbitCodes.join(",") ? current : nextUpbitCodes
        ))
        setData((current) => current ?? payload)
        if (!binanceMapRef.current.size) {
          setStatus(deriveStatus(payload))
          setPulse((value) => value + 1)
        }
        setError(null)
      } catch (err) {
        if (!alive) return
        if (isAbortError(err)) return
        if (!binanceMapRef.current.size) setStatus("error")
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    load()
    timer = setInterval(load, pollMs)

    return () => {
      alive = false
      abortRef.current?.abort()
      if (timer) clearInterval(timer)
    }
  }, [pollMs])

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let staleTimer: ReturnType<typeof setInterval> | null = null
    let closedByCleanup = false
    let attempts = 0
    let ws: WebSocket | null = null

    const connect = () => {
      if (typeof window === "undefined") return
      setBinanceTransportStatus("connecting")
      ws = new WebSocket(BINANCE_MINI_TICKER_WS)

      ws.onopen = () => {
        attempts = 0
        setBinanceTransportStatus("connected")
      }

      ws.onmessage = (event) => {
        try {
          const messages = JSON.parse(event.data) as BinanceMiniTickerMessage[]
          if (!Array.isArray(messages)) return
          let changed = false
          for (const message of messages) {
            if (!binanceSymbolSet.has(message.s)) continue
            const ticker = miniTickerToBinance24h(message)
            if (!ticker) continue
            binanceMapRef.current.set(ticker.symbol, ticker)
            changed = true
          }
          if (changed) {
            lastBinanceMessageAtRef.current = Date.now()
            setBinanceTransportStatus("connected")
            scheduleStreamRebuild()
          }
        } catch {
          // Ignore malformed websocket frames and keep the stream alive.
        }
      }

      ws.onerror = () => {
        setBinanceTransportStatus("error")
      }

      ws.onclose = () => {
        if (closedByCleanup) return
        setBinanceTransportStatus("stale")
        const delay = Math.min(30000, 1000 * 2 ** attempts)
        attempts += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()
    staleTimer = setInterval(() => {
      const last = lastBinanceMessageAtRef.current
      if (last && Date.now() - last > STALE_AFTER_MS) setBinanceTransportStatus("stale")
    }, 5000)

    return () => {
      closedByCleanup = true
      ws?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (staleTimer) clearInterval(staleTimer)
    }
  }, [binanceSymbolSet, scheduleStreamRebuild, setBinanceTransportStatus])

  useEffect(() => {
    const codes = upbitSubscriptionCodes
    if (!codes.length || codes.join(",") === upbitCodesRef.current.join(",")) return
    upbitCodesRef.current = codes

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let staleTimer: ReturnType<typeof setInterval> | null = null
    let closedByCleanup = false
    let attempts = 0
    let ws: WebSocket | null = null

    const connect = () => {
      if (typeof window === "undefined") return
      setUpbitTransportStatus("connecting")
      ws = new WebSocket(UPBIT_WS_URL)

      ws.binaryType = "arraybuffer"

      ws.onopen = () => {
        attempts = 0
        setUpbitTransportStatus("connected")
        ws?.send(JSON.stringify([
          { ticket: "quantterminal-sector-rotation" },
          { type: "ticker", codes },
          { format: "DEFAULT" },
        ]))
      }

      ws.onmessage = async (event) => {
        const message = await decodeUpbitMessage(event.data)
        const ticker = message ? upbitStreamToTicker(message) : null
        if (!ticker) return
        upbitMapRef.current.set(ticker.market, ticker)
        lastUpbitMessageAtRef.current = Date.now()
        setUpbitTransportStatus("connected")
        scheduleStreamRebuild()
      }

      ws.onerror = () => {
        setUpbitTransportStatus("error")
      }

      ws.onclose = () => {
        if (closedByCleanup) return
        setUpbitTransportStatus("stale")
        const delay = Math.min(30000, 1000 * 2 ** attempts)
        attempts += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()
    staleTimer = setInterval(() => {
      const last = lastUpbitMessageAtRef.current
      if (last && Date.now() - last > STALE_AFTER_MS) setUpbitTransportStatus("stale")
    }, 5000)

    return () => {
      closedByCleanup = true
      ws?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (staleTimer) clearInterval(staleTimer)
    }
  }, [upbitSubscriptionCodes, scheduleStreamRebuild, setUpbitTransportStatus])

  return {
    data,
    status,
    error,
    pulse,
    transport: {
      binance: binanceWsStatus,
      upbit: upbitWsStatus,
      pollingFallback: pollMs,
    },
  }
}
