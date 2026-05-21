"use client"

import { useEffect, useRef, useState } from "react"

interface FootprintLevel {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  total: number
}

const MAX_LEVELS = 60
const PRELOAD_LIMIT = 1000

function normalizeSymbol(
  symbol: string
) {
  return (
    symbol || "BTCUSDT"
  )
    .replace("/", "")
    .toUpperCase()
}

function updateFootprintMap(
  footprintMap: Map<number, FootprintLevel>,
  price: number,
  qty: number,
  isSell: boolean
) {
  const bucketPrice =
    Math.floor(price)

  const existing =
    footprintMap.get(bucketPrice) || {
      price: bucketPrice,
      buyVolume: 0,
      sellVolume: 0,
      delta: 0,
      total: 0,
    }

  if (isSell) {
    existing.sellVolume += qty
  } else {
    existing.buyVolume += qty
  }

  existing.delta =
    existing.buyVolume -
    existing.sellVolume

  existing.total =
    existing.buyVolume +
    existing.sellVolume

  footprintMap.set(
    bucketPrice,
    existing
  )
}

function toSortedLevels(
  footprintMap: Map<number, FootprintLevel>
) {
  return Array.from(
    footprintMap.values()
  )
    .sort((a, b) => b.price - a.price)
    .slice(0, MAX_LEVELS)
}

export default function useFootprint(
  symbol: string
) {
  const [levels, setLevels] = useState<
    FootprintLevel[]
  >([])

  const requestIdRef =
    useRef(0)

  useEffect(() => {
    const normalizedSymbol =
      normalizeSymbol(symbol)

    const footprintMap = new Map<
      number,
      FootprintLevel
    >()

    let closed = false

    const requestId =
      requestIdRef.current + 1

    requestIdRef.current =
      requestId

    async function preload() {
      try {
        const res =
          await fetch(
            `https://fapi.binance.com/fapi/v1/aggTrades?symbol=${normalizedSymbol}&limit=${PRELOAD_LIMIT}`,
            {
              cache: "no-store",
            }
          )

        if (!res.ok) {
          throw new Error(
            `Failed to preload aggTrades: ${res.status}`
          )
        }

        const trades =
          await res.json()

        if (
          closed ||
          requestIdRef.current !== requestId
        ) {
          return
        }

        trades.forEach((trade: any) => {
          const price =
            Number(trade.p)

          const qty =
            Number(trade.q)

          const isSell =
            Boolean(trade.m)

          updateFootprintMap(
            footprintMap,
            price,
            qty,
            isSell
          )
        })

        setLevels(
          toSortedLevels(
            footprintMap
          )
        )
      } catch (err) {
        console.error(
          "FOOTPRINT PRELOAD ERROR:",
          err
        )
      }
    }

    preload()

    const ws = new WebSocket(
      `wss://fstream.binance.com/ws/${normalizedSymbol.toLowerCase()}@aggTrade`
    )

    ws.onmessage = (event) => {
      if (closed) return

      const data =
        JSON.parse(event.data)

      const price =
        Number(data.p)

      const qty =
        Number(data.q)

      const isSell =
        Boolean(data.m)

      updateFootprintMap(
        footprintMap,
        price,
        qty,
        isSell
      )

      setLevels(
        toSortedLevels(
          footprintMap
        )
      )
    }

    ws.onerror = (err) => {
      console.error(
        "FOOTPRINT WS ERROR:",
        err
      )
    }

    return () => {
      closed = true
      ws.close()
    }
  }, [symbol])

  return levels
}
