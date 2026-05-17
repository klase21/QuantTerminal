"use client"

import { useEffect, useRef, useState } from "react"

interface HeatLevel {
  price: number
  liquidity: number
  side: "bid" | "ask"
}

export interface LiquidityEvent {
  id: string
  type:
    | "WALL_ADDED"
    | "WALL_PULLED"
    | "WALL_SWEPT"

  side: "bid" | "ask"

  price: number
  liquidity: number
  timestamp: number
}

const WALL_THRESHOLD = 100

export default function useLiquidityEvents(
  levels: HeatLevel[]
) {
  const [events, setEvents] = useState<
    LiquidityEvent[]
  >([])

  const previousLevelsRef = useRef<
    Map<string, HeatLevel>
  >(new Map())

  useEffect(() => {
    if (!levels.length) return

    const currentMap = new Map<
      string,
      HeatLevel
    >()

    levels.forEach((level) => {
      const key = `${level.side}-${level.price}`

      currentMap.set(key, level)
    })

    const newEvents: LiquidityEvent[] = []

    currentMap.forEach((current, key) => {
      const previous =
        previousLevelsRef.current.get(key)

      // 신규 대형 벽 생성
      if (
        !previous &&
        current.liquidity >= WALL_THRESHOLD
      ) {
        newEvents.push({
          id: crypto.randomUUID(),
          type: "WALL_ADDED",
          side: current.side,
          price: current.price,
          liquidity: current.liquidity,
          timestamp: Date.now(),
        })
      }

      // liquidity 급증
      if (
        previous &&
        previous.liquidity <
          WALL_THRESHOLD &&
        current.liquidity >=
          WALL_THRESHOLD
      ) {
        newEvents.push({
          id: crypto.randomUUID(),
          type: "WALL_ADDED",
          side: current.side,
          price: current.price,
          liquidity: current.liquidity,
          timestamp: Date.now(),
        })
      }

      // liquidity 급감 = sweep/pull
      if (
        previous &&
        previous.liquidity >=
          WALL_THRESHOLD &&
        current.liquidity <
          WALL_THRESHOLD * 0.2
      ) {
        newEvents.push({
          id: crypto.randomUUID(),
          type: "WALL_PULLED",
          side: current.side,
          price: current.price,
          liquidity: current.liquidity,
          timestamp: Date.now(),
        })
      }
    })

    previousLevelsRef.current = currentMap

    if (newEvents.length) {
      setEvents((prev) => [
        ...newEvents,
        ...prev,
      ].slice(0, 50))
    }
  }, [levels])

  return events
}