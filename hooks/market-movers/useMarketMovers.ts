"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { useSafePolling } from "@/hooks/system/useSafePolling"
import { buildMarketMoversResponse } from "@/lib/market-movers/buildMarketMovers"
import type { BinanceFuturesTicker24h, MarketMoversResponse } from "@/lib/market-movers/types"

const BINANCE_USDM_TICKER_WS_URL = "wss://fstream.binance.com/market/ws/!ticker@arr"
const WS_REBUILD_THROTTLE_MS = 2500

function buildMarketMoversUrl(focusSymbol?: string | null) {
  const symbol = focusSymbol?.trim().toUpperCase()
  if (!symbol) return "/api/market/movers"
  return `/api/market/movers?focus=${encodeURIComponent(symbol)}`
}

type BinanceTickerArrayItem = {
  s?: string
  p?: string
  P?: string
  w?: string
  c?: string
  Q?: string
  o?: string
  h?: string
  l?: string
  v?: string
  q?: string
  O?: number
  C?: number
  F?: number
  L?: number
  n?: number
}

function mapWsTickerToRestTicker(item: BinanceTickerArrayItem): BinanceFuturesTicker24h | null {
  if (!item.s || !item.s.endsWith("USDT")) return null
  return {
    symbol: item.s,
    priceChange: item.p,
    priceChangePercent: item.P,
    weightedAvgPrice: item.w,
    lastPrice: item.c,
    lastQty: item.Q,
    openPrice: item.o,
    highPrice: item.h,
    lowPrice: item.l,
    volume: item.v,
    quoteVolume: item.q,
    openTime: item.O,
    closeTime: item.C,
    firstId: item.F,
    lastId: item.L,
    count: item.n,
  }
}

function responseIsUsable(data: MarketMoversResponse | null) {
  if (!data) return false
  if (!data.ok) return false
  if ((data.summary?.scanned ?? 0) <= 0) return false
  return true
}

export function useMarketMovers(enabled = true, focusSymbol?: string | null) {
  const restState = useSafePolling<MarketMoversResponse>(buildMarketMoversUrl(focusSymbol), 60000, {
    timeoutMs: 9000,
    retries: 1,
    label: "market-movers",
    enabled,
  })
  const [wsResponse, setWsResponse] = useState<MarketMoversResponse | null>(null)
  const [wsError, setWsError] = useState<string | null>(null)
  const lastBuildAt = useRef(0)
  const latestFocus = useRef(focusSymbol)

  useEffect(() => {
    latestFocus.current = focusSymbol
  }, [focusSymbol])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return

    let closed = false
    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (closed) return
      try {
        socket = new WebSocket(BINANCE_USDM_TICKER_WS_URL)
        socket.onopen = () => setWsError(null)
        socket.onerror = () => setWsError("Market ticker websocket error")
        socket.onclose = () => {
          if (!closed) reconnectTimer = setTimeout(connect, 3500)
        }
        socket.onmessage = (event) => {
          const now = Date.now()
          if (now - lastBuildAt.current < WS_REBUILD_THROTTLE_MS) return
          lastBuildAt.current = now

          try {
            const payload = JSON.parse(event.data) as BinanceTickerArrayItem[]
            if (!Array.isArray(payload)) return
            const tickers = payload
              .map(mapWsTickerToRestTicker)
              .filter((item): item is BinanceFuturesTicker24h => Boolean(item))
            if (!tickers.length) return
            const response = buildMarketMoversResponse(tickers, new Date(), latestFocus.current)
            setWsResponse({
              ...response,
              mode: "live-discovery",
              notes: [
                "Browser websocket fallback active: using Binance USD-M !ticker@arr stream because server REST may be unavailable on production hosting.",
                ...response.notes,
              ],
            })
          } catch {
            setWsError("Failed to parse market ticker websocket payload")
          }
        }
      } catch {
        setWsError("Failed to connect market ticker websocket")
        reconnectTimer = setTimeout(connect, 3500)
      }
    }

    connect()
    return () => {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [enabled])

  return useMemo(() => {
    const useWs = !responseIsUsable(restState.data) && responseIsUsable(wsResponse)
    const data = useWs ? wsResponse : restState.data
    const error = restState.error ?? wsError
    return {
      ...restState,
      data,
      error,
      loading: restState.loading && !wsResponse,
      lastUpdatedAt: useWs ? wsResponse?.updatedAt ?? restState.lastUpdatedAt : restState.lastUpdatedAt,
    }
  }, [restState, wsResponse, wsError])
}
