"use client"

import {
  useEffect,
  useMemo,
  useState,
} from "react"

interface Trade {
  price: number
  qty: number
  side: "buy" | "sell"
  time: number
}

interface AbsorptionEvent {
  price: number
  side: "buy" | "sell"
  volume: number
  time: number
}

export default function useAbsorptionDetector(
  trades: Trade[] = []
) {
  const [events, setEvents] = useState<
    AbsorptionEvent[]
  >([])

  const grouped = useMemo(() => {

    if (!Array.isArray(trades)) {
      return []
    }

    const map = new Map<
      string,
      {
        volume: number
        side: "buy" | "sell"
        time: number
      }
    >()

    for (const trade of trades) {

      if (!trade) continue

      const key =
        `${trade.price}-${trade.side}`

      const existing =
        map.get(key)

      if (existing) {

        existing.volume +=
          Number(trade.qty || 0)

        existing.time =
          trade.time

      } else {

        map.set(key, {
          volume:
            Number(trade.qty || 0),
          side:
            trade.side,
          time:
            trade.time,
        })

      }
    }

    return Array.from(map.entries())

  }, [trades])

  useEffect(() => {

    const next: AbsorptionEvent[] = []

    for (const [key, value] of grouped) {

      // ABSORPTION THRESHOLD
      if (value.volume >= 25) {

        const [price] =
          key.split("-")

        next.push({
          price: Number(price),
          side: value.side,
          volume: value.volume,
          time: value.time,
        })

      }
    }

    next.sort(
      (a, b) => b.time - a.time
    )

    setEvents(
      next.slice(0, 20)
    )

  }, [grouped])

  return events
}