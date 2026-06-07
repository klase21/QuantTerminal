"use client"

import { useEffect } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"
import { useMarketStore } from "@/stores/useMarketStore"
import { normalizeTacticalSymbol } from "@/core/tactical/tacticalRoute"

const POLL_INTERVAL_MS = 1500

function depthStreamUrl(symbol: string, market: "FUTURES" | "SPOT") {
  const stream = `${symbol.toLowerCase()}@depth20@500ms`
  if (market === "SPOT") return `wss://stream.binance.com:9443/ws/${stream}`
  return `wss://fstream.binance.com/public/ws/${stream}`
}

function depthRestUrl(symbol: string, market: "FUTURES" | "SPOT") {
  if (market === "SPOT") return `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`
  return `https://fapi.binance.com/fapi/v1/depth?symbol=${symbol}&limit=20`
}

function normalizeDepth(data: any) {
  const bids =
    data?.bids?.map(([price, quantity]: string[]) => ({
      price: Number(price),
      quantity: Number(quantity),
    })) ||
    data?.b?.map(([price, quantity]: string[]) => ({
      price: Number(price),
      quantity: Number(quantity),
    })) ||
    []

  const asks =
    data?.asks?.map(([price, quantity]: string[]) => ({
      price: Number(price),
      quantity: Number(quantity),
    })) ||
    data?.a?.map(([price, quantity]: string[]) => ({
      price: Number(price),
      quantity: Number(quantity),
    })) ||
    []

  return { bids, asks }
}

export default function useOrderbookSocket(symbol: string) {
  const setOrderbook = useMarketStore((s) => s.setOrderbook)
  const normalizedSymbol = normalizeTacticalSymbol(symbol)

  useEffect(() => {
    if (!normalizedSymbol) return

    let closed = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let polling = false
    let market: "FUTURES" | "SPOT" = "FUTURES"
    let unsubscribeWs: (() => void) | null = null
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const applyDepth = (data: any) => {
      const depth = normalizeDepth(data)
      if (depth.bids.length || depth.asks.length) setOrderbook(depth)
    }

    const pollOnce = async () => {
      if (closed) return

      try {
        const res = await fetch(depthRestUrl(normalizedSymbol, market), { cache: "no-store" })
        if (!res.ok && market === "FUTURES") {
          market = "SPOT"
          return pollOnce()
        }
        if (!res.ok) throw new Error(`Depth REST failed: ${res.status}`)
        const data = await res.json()
        if (!closed) applyDepth(data)
      } catch (error) {
        console.warn("Orderbook REST fallback error", error)
      } finally {
        if (!closed) pollTimer = setTimeout(pollOnce, POLL_INTERVAL_MS)
      }
    }

    const startPolling = () => {
      if (polling || closed) return
      polling = true
      pollOnce()
    }

    const stopPolling = () => {
      polling = false
      if (pollTimer) {
        clearTimeout(pollTimer)
        pollTimer = null
      }
    }

    const connect = () => {
      unsubscribeWs = subscribeJsonStream(
        depthStreamUrl(normalizedSymbol, market),
        (data) => {
          if (closed) return
          try {
            applyDepth(data)
          } catch (err) {
            console.warn("Orderbook parse error", err)
          }
        },
        (status) => {
          if (closed) return
          if (status === "open") {
            if (fallbackTimer) {
              clearTimeout(fallbackTimer)
              fallbackTimer = null
            }
            stopPolling()
            return
          }
          if (status === "error" || status === "closed") {
            // REST is fallback only. Do not let polling hide broken WS URLs.
            if (!fallbackTimer) fallbackTimer = setTimeout(startPolling, 2500)
          }
        },
      )
    }

    // WebSocket is primary. REST polling starts only if WS fails/stays closed.
    connect()

    return () => {
      closed = true
      if (pollTimer) clearTimeout(pollTimer)
      if (fallbackTimer) clearTimeout(fallbackTimer)
      unsubscribeWs?.()
    }
  }, [normalizedSymbol, setOrderbook])
}
