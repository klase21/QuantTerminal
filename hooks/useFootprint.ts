"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeJsonStream } from "@/lib/realtime/sharedWsManager"

interface FootprintLevel {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  total: number
}

const MAX_LEVELS = 60
const PRELOAD_LIMIT = 500
const POLL_LIMIT = 120
const POLL_INTERVAL_MS = 1800

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

function updateFootprintMap(
  footprintMap: Map<number, FootprintLevel>,
  price: number,
  qty: number,
  isSell: boolean,
) {
  const bucketPrice = Math.floor(price)

  const existing = footprintMap.get(bucketPrice) || {
    price: bucketPrice,
    buyVolume: 0,
    sellVolume: 0,
    delta: 0,
    total: 0,
  }

  if (isSell) existing.sellVolume += qty
  else existing.buyVolume += qty

  existing.delta = existing.buyVolume - existing.sellVolume
  existing.total = existing.buyVolume + existing.sellVolume

  footprintMap.set(bucketPrice, existing)
}

function toSortedLevels(footprintMap: Map<number, FootprintLevel>) {
  return Array.from(footprintMap.values())
    .sort((a, b) => b.price - a.price)
    .slice(0, MAX_LEVELS)
}

function aggTradesUrl(symbol: string, limit: number) {
  return `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${symbol}&limit=${limit}`
}

export default function useFootprint(symbol: string) {
  const [levels, setLevels] = useState<FootprintLevel[]>([])
  const requestIdRef = useRef(0)

  useEffect(() => {
    const normalizedSymbol = normalizeSymbol(symbol)
    const footprintMap = new Map<number, FootprintLevel>()
    const seenIds = new Set<number>()

    let closed = false
    let polling = false
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let unsubscribeWs: (() => void) | null = null

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    const isCurrent = () => !closed && requestIdRef.current === requestId

    const applyRawTrade = (trade: any) => {
      const id = Number(trade?.a ?? trade?.t ?? trade?.T ?? Date.now())
      if (seenIds.has(id)) return
      seenIds.add(id)

      const price = Number(trade?.p)
      const qty = Number(trade?.q)
      const isSell = Boolean(trade?.m)
      if (!Number.isFinite(price) || !Number.isFinite(qty) || qty <= 0) return

      updateFootprintMap(footprintMap, price, qty, isSell)

      if (seenIds.size > 1500) {
        const keep = Array.from(seenIds).slice(-800)
        seenIds.clear()
        keep.forEach((item) => seenIds.add(item))
      }
    }

    const emit = () => {
      if (isCurrent()) setLevels(toSortedLevels(footprintMap))
    }

    async function loadRecent(limit = POLL_LIMIT) {
      try {
        const res = await fetch(aggTradesUrl(normalizedSymbol, limit), { cache: "no-store" })
        if (!res.ok) throw new Error(`Footprint aggTrades failed: ${res.status}`)
        const trades = await res.json()
        if (!isCurrent() || !Array.isArray(trades)) return

        trades.forEach(applyRawTrade)
        emit()
      } catch (err) {
        if (isCurrent()) console.warn("FOOTPRINT REST FALLBACK ERROR:", err)
      }
    }

    function startPolling() {
      if (polling || !isCurrent()) return
      polling = true

      const tick = async () => {
        if (!isCurrent()) return
        await loadRecent(POLL_LIMIT)
        if (!isCurrent()) return
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
      }

      tick()
    }

    async function preload() {
      await loadRecent(PRELOAD_LIMIT)
    }

    function connect() {
      unsubscribeWs = subscribeJsonStream(
        `wss://fstream.binance.com/market/ws/${normalizedSymbol.toLowerCase()}@aggTrade`,
        (data) => {
          if (!isCurrent()) return
          try {
            applyRawTrade(data)
            emit()
          } catch (err) {
            console.warn("FOOTPRINT MESSAGE PARSE ERROR:", err)
          }
        },
        (status) => {
          if (!isCurrent()) return
          if (status === "error" || status === "closed") startPolling()
        },
      )
    }

    preload()
    startPolling()
    connect()

    return () => {
      closed = true
      if (pollTimer) clearTimeout(pollTimer)
      unsubscribeWs?.()
    }
  }, [symbol])

  return levels
}
