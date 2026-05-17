"use client"

import {
  useEffect,
  useState,
} from "react"

export interface OrderBookLevel {

  price: number

  quantity: number

}

export interface HeatmapSnapshot {

  time: number

  bids: OrderBookLevel[]

  asks: OrderBookLevel[]

}

export default function useHeatmapHistory(

  bids: OrderBookLevel[],

  asks: OrderBookLevel[]

) {

  const [history, setHistory] =
    useState<HeatmapSnapshot[]>([])

  useEffect(() => {

    if (
      bids.length === 0 &&
      asks.length === 0
    ) {
      return
    }

    const snapshot: HeatmapSnapshot = {

      time: Date.now(),

      bids,

      asks,

    }

    setHistory((prev) => {

      const merged = [
        ...prev,
        snapshot,
      ]

      return merged.slice(-120)

    })

  }, [bids, asks])

  return history
}