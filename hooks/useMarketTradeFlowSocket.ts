"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"
import type { MutableRefObject } from "react"
import type { MarketFlowSnapshot } from "@/core/dual-market/dualMarketTypes"

type MarketSource = "SPOT" | "FUTURES"
type TradeSide = "buy" | "sell"

type ConnectionMode = "idle" | "ws" | "polling"

interface FlowTrade {
  id: number
  price: number
  qty: number
  side: TradeSide
  time: number
  value: number
  symbol: string
  source: MarketSource
}

interface MarketTradeFlowState extends MarketFlowSnapshot {
  trades: FlowTrade[]
  connected: boolean
  lastUpdate: number | null
  connectionMode: ConnectionMode
}

const PRELOAD_LIMIT = 500
const POLL_LIMIT = 120
const POLL_INTERVAL_MS = 1500
const ROLLING_WINDOW = 200

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

function emptyFlow(symbol: string, source: MarketSource): MarketTradeFlowState {
  return {
    symbol,
    source,
    buyVolume: 0,
    sellVolume: 0,
    buyPressure: 50,
    sellPressure: 50,
    delta: 0,
    cvd: 0,
    trades: [],
    connected: false,
    lastUpdate: null,
    connectionMode: "idle",
  }
}

function streamUrl(symbol: string, source: MarketSource) {
  const stream = `${symbol.toLowerCase()}@aggTrade`
  if (source === "SPOT") return `wss://stream.binance.com:9443/ws/${stream}`
  return `wss://fstream.binance.com/market/ws/${stream}`
}

function aggTradesUrl(symbol: string, source: MarketSource, limit = PRELOAD_LIMIT) {
  const base =
    source === "SPOT"
      ? "https://api.binance.com/api/v3/aggTrades"
      : "https://fapi.binance.com/fapi/v1/aggTrades"

  return `${base}?symbol=${symbol}&limit=${limit}`
}

function normalizeTrade(raw: any, symbol: string, source: MarketSource): FlowTrade | null {
  const price = Number(raw?.p)
  const qty = Number(raw?.q)
  const time = Number(raw?.T || raw?.E || Date.now())
  const id = Number(raw?.a ?? raw?.t ?? raw?.T ?? Date.now())

  if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return null

  const isSell = raw?.m === true

  return {
    id,
    price,
    qty,
    side: isSell ? "sell" : "buy",
    time,
    value: price * qty,
    symbol,
    source,
  }
}

function applyNormalizedTrade({
  trade,
  buyRef,
  sellRef,
  cvdRef,
  tradesRef,
  seenRef,
}: {
  trade: FlowTrade
  buyRef: MutableRefObject<number>
  sellRef: MutableRefObject<number>
  cvdRef: MutableRefObject<number>
  tradesRef: MutableRefObject<FlowTrade[]>
  seenRef: MutableRefObject<Set<number>>
}) {
  if (seenRef.current.has(trade.id)) return
  seenRef.current.add(trade.id)

  if (trade.side === "sell") {
    sellRef.current += trade.qty
    cvdRef.current -= trade.qty
  } else {
    buyRef.current += trade.qty
    cvdRef.current += trade.qty
  }

  tradesRef.current = [trade, ...tradesRef.current].slice(0, ROLLING_WINDOW)

  if (seenRef.current.size > 1200) {
    const idsToKeep = new Set(tradesRef.current.map((item) => item.id))
    seenRef.current = idsToKeep
  }
}

function applyTrade({
  raw,
  symbol,
  source,
  buyRef,
  sellRef,
  cvdRef,
  tradesRef,
  seenRef,
}: {
  raw: any
  symbol: string
  source: MarketSource
  buyRef: MutableRefObject<number>
  sellRef: MutableRefObject<number>
  cvdRef: MutableRefObject<number>
  tradesRef: MutableRefObject<FlowTrade[]>
  seenRef: MutableRefObject<Set<number>>
}) {
  const trade = normalizeTrade(raw, symbol, source)
  if (!trade) return

  applyNormalizedTrade({ trade, buyRef, sellRef, cvdRef, tradesRef, seenRef })
}

function buildState({
  symbol,
  source,
  buyRef,
  sellRef,
  cvdRef,
  tradesRef,
  connected,
  connectionMode,
}: {
  symbol: string
  source: MarketSource
  buyRef: MutableRefObject<number>
  sellRef: MutableRefObject<number>
  cvdRef: MutableRefObject<number>
  tradesRef: MutableRefObject<FlowTrade[]>
  connected: boolean
  connectionMode: ConnectionMode
}): MarketTradeFlowState {
  const rollingTrades = tradesRef.current.slice(0, ROLLING_WINDOW)

  // Display session-level accumulated volume.
  // Do not recalculate Buy/Sell from the rolling trade window, because that makes
  // values fall when old trades leave the visible window.
  const buyVolume = buyRef.current
  const sellVolume = sellRef.current
  const delta = buyVolume - sellVolume
  const total = Math.max(1, buyVolume + sellVolume)

  return {
    symbol,
    source,
    buyVolume,
    sellVolume,
    buyPressure: Math.round((buyVolume / total) * 100),
    sellPressure: Math.round((sellVolume / total) * 100),
    delta,
    cvd: cvdRef.current,
    trades: rollingTrades,
    connected,
    lastUpdate: Date.now(),
    connectionMode,
  }
}

export default function useMarketTradeFlowSocket(symbol: string, source: MarketSource) {
  const normalizedSymbol = normalizeSymbol(symbol)

  const [flow, setFlow] = useState<MarketTradeFlowState>(() =>
    emptyFlow(normalizedSymbol, source),
  )

  const cvdRef = useRef(0)
  const buyRef = useRef(0)
  const sellRef = useRef(0)
  const tradesRef = useRef<FlowTrade[]>([])
  const seenRef = useRef<Set<number>>(new Set())
  const socketSeqRef = useRef(0)
  const activeKeyRef = useRef(`${source}:${normalizedSymbol}`)

  useEffect(() => {
    const currentSymbol = normalizeSymbol(symbol)
    const currentKey = `${source}:${currentSymbol}`

    activeKeyRef.current = currentKey
    socketSeqRef.current += 1
    const socketSeq = socketSeqRef.current

    cvdRef.current = 0
    buyRef.current = 0
    sellRef.current = 0
    tradesRef.current = []
    seenRef.current = new Set()

    setFlow(emptyFlow(currentSymbol, source))

    let mounted = true
    let connected = false
    let polling = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let unsubscribeWs: (() => void) | null = null
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const isCurrent = () =>
      mounted &&
      activeKeyRef.current === currentKey &&
      socketSeqRef.current === socketSeq

    const emit = (mode: ConnectionMode, isConnected = connected) => {
      if (!isCurrent()) return
      setFlow(
        buildState({
          symbol: currentSymbol,
          source,
          buyRef,
          sellRef,
          cvdRef,
          tradesRef,
          connected: isConnected,
          connectionMode: mode,
        }),
      )
    }

    async function loadRecent(limit = PRELOAD_LIMIT, mode: ConnectionMode = "polling") {
      try {
        const res = await fetch(aggTradesUrl(currentSymbol, source, limit), {
          cache: "no-store",
        })

        if (!res.ok) throw new Error(`${source} aggTrades failed: ${res.status}`)

        const trades = await res.json()
        if (!isCurrent() || !Array.isArray(trades)) return

        for (const raw of trades) {
          applyTrade({
            raw,
            symbol: currentSymbol,
            source,
            buyRef,
            sellRef,
            cvdRef,
            tradesRef,
            seenRef,
          })
        }

        emit(mode, true)
      } catch (error) {
        if (isCurrent()) {
          console.warn(`[${source}] TRADE FLOW POLL FALLBACK ERROR`, error)
          emit(mode, false)
        }
      }
    }

    function startPolling() {
      if (polling || !isCurrent()) return
      polling = true

      const tick = async () => {
        if (!isCurrent()) return
        await loadRecent(POLL_LIMIT, "polling")
        if (!isCurrent()) return
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
      }

      tick()
    }

    function connect() {
      unsubscribeWs = subscribeJsonStream(
        streamUrl(currentSymbol, source),
        (data) => {
          if (!isCurrent()) return

          try {
            applyTrade({
              raw: data,
              symbol: currentSymbol,
              source,
              buyRef,
              sellRef,
              cvdRef,
              tradesRef,
              seenRef,
            })
            connected = true
            emit("ws", true)
          } catch (error) {
            console.warn(`[${source}] TRADE FLOW MESSAGE PARSE ERROR`, error)
          }
        },
        (status) => {
          if (!isCurrent()) return
          if (status === "open") {
            connected = true
            if (fallbackTimer) {
              clearTimeout(fallbackTimer)
              fallbackTimer = null
            }
            emit("ws", true)
            return
          }
          if (status === "error" || status === "closed") {
            connected = false
            // REST is fallback only. Do not start it until WS has failed/stayed closed.
            if (!fallbackTimer) fallbackTimer = setTimeout(startPolling, 2500)
          }
        },
      )
    }

    // WebSocket is primary. REST polling starts only if WS fails/stays closed.
    connect()

    return () => {
      mounted = false
      if (pollTimer) clearTimeout(pollTimer)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      unsubscribeWs?.()
    }
  }, [symbol, source])

  return flow
}
