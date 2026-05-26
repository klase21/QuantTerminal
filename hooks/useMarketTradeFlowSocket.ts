"use client"

import { useEffect, useRef, useState } from "react"
import type { MarketFlowSnapshot } from "@/core/dual-market/dualMarketTypes"

type MarketSource = "SPOT" | "FUTURES"
type TradeSide = "buy" | "sell"

interface FlowTrade {
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
}

const PRELOAD_LIMIT = 500

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

function emptyFlow(symbol: string, source: MarketSource): MarketTradeFlowState {
  return {
    symbol,
    source,
    buyVolume: 0,
    sellVolume: 0,
    buyPressure: 0,
    sellPressure: 0,
    cvd: 0,
    trades: [],
    connected: false,
    lastUpdate: null,
  }
}

function streamUrl(symbol: string, source: MarketSource) {
  const stream = `${symbol.toLowerCase()}@aggTrade`
  if (source === "SPOT") return `wss://stream.binance.com:9443/ws/${stream}`
  return `wss://fstream.binance.com/ws/${stream}`
}

function preloadUrl(symbol: string, source: MarketSource) {
  if (source === "SPOT") {
    return `https://api.binance.com/api/v3/aggTrades?symbol=${symbol}&limit=${PRELOAD_LIMIT}`
  }
  return `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&limit=${PRELOAD_LIMIT}`
}

function applyTrade({
  trade,
  symbol,
  source,
  buyRef,
  sellRef,
  cvdRef,
  tradesRef,
}: {
  trade: any
  symbol: string
  source: MarketSource
  buyRef: React.MutableRefObject<number>
  sellRef: React.MutableRefObject<number>
  cvdRef: React.MutableRefObject<number>
  tradesRef: React.MutableRefObject<FlowTrade[]>
}) {
  const price = Number(trade.p)
  const qty = Number(trade.q)
  const time = Number(trade.T)
  if (!Number.isFinite(price) || !Number.isFinite(qty)) return

  const isSell = Boolean(trade.m)
  const side: TradeSide = isSell ? "sell" : "buy"

  if (isSell) {
    sellRef.current += qty
    cvdRef.current -= qty
  } else {
    buyRef.current += qty
    cvdRef.current += qty
  }

  const normalizedTrade: FlowTrade = {
    price,
    qty,
    side,
    time,
    value: price * qty,
    symbol,
    source,
  }

  tradesRef.current = [normalizedTrade, ...tradesRef.current].slice(0, 200)
}

function buildState({
  symbol,
  source,
  buyRef,
  sellRef,
  cvdRef,
  tradesRef,
  connected,
}: {
  symbol: string
  source: MarketSource
  buyRef: React.MutableRefObject<number>
  sellRef: React.MutableRefObject<number>
  cvdRef: React.MutableRefObject<number>
  tradesRef: React.MutableRefObject<FlowTrade[]>
  connected: boolean
}): MarketTradeFlowState {
  const buyVolume = buyRef.current
  const sellVolume = sellRef.current
  const total = Math.max(1, buyVolume + sellVolume)

  return {
    symbol,
    source,
    buyVolume,
    sellVolume,
    buyPressure: Math.round((buyVolume / total) * 100),
    sellPressure: Math.round((sellVolume / total) * 100),
    cvd: cvdRef.current,
    trades: tradesRef.current,
    connected,
    lastUpdate: Date.now(),
  }
}

export default function useMarketTradeFlowSocket(
  symbol: string,
  source: MarketSource,
) {
  const normalizedSymbol = normalizeSymbol(symbol)

  const [flow, setFlow] = useState<MarketTradeFlowState>(() =>
    emptyFlow(normalizedSymbol, source),
  )

  const cvdRef = useRef(0)
  const buyRef = useRef(0)
  const sellRef = useRef(0)
  const tradesRef = useRef<FlowTrade[]>([])
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

    setFlow(emptyFlow(currentSymbol, source))

    let ws: WebSocket | null = null
    let mounted = true
    let connected = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const isCurrent = () =>
      mounted &&
      activeKeyRef.current === currentKey &&
      socketSeqRef.current === socketSeq

    async function preload() {
      try {
        const res = await fetch(preloadUrl(currentSymbol, source), {
          cache: "no-store",
        })

        if (!res.ok) throw new Error(`${source} preload failed: ${res.status}`)

        const trades = await res.json()
        if (!isCurrent()) return

        for (const trade of trades) {
          applyTrade({
            trade,
            symbol: currentSymbol,
            source,
            buyRef,
            sellRef,
            cvdRef,
            tradesRef,
          })
        }

        setFlow(
          buildState({
            symbol: currentSymbol,
            source,
            buyRef,
            sellRef,
            cvdRef,
            tradesRef,
            connected,
          }),
        )
      } catch (error) {
        console.error(`[${source}] TRADE FLOW PRELOAD ERROR`, error)
      }
    }

    function connect() {
      ws = new WebSocket(streamUrl(currentSymbol, source))

      ws.onopen = () => {
        connected = true
        if (!isCurrent()) return

        setFlow((prev) => ({
          ...prev,
          connected: true,
          lastUpdate: Date.now(),
        }))
      }

      ws.onmessage = (event) => {
        if (!isCurrent()) return

        const data = JSON.parse(event.data)

        applyTrade({
          trade: data,
          symbol: currentSymbol,
          source,
          buyRef,
          sellRef,
          cvdRef,
          tradesRef,
        })

        setFlow(
          buildState({
            symbol: currentSymbol,
            source,
            buyRef,
            sellRef,
            cvdRef,
            tradesRef,
            connected: true,
          }),
        )
      }

      ws.onerror = (error) => {
        console.error(`[${source}] TRADE FLOW WS ERROR`, error)
        ws?.close()
      }

      ws.onclose = () => {
        connected = false
        if (!isCurrent()) return

        setFlow((prev) => ({
          ...prev,
          connected: false,
        }))

        reconnectTimer = setTimeout(connect, 2000)
      }
    }

    preload()
    connect()

    return () => {
      mounted = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [symbol, source])

  return flow
}
