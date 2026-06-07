"use client"

import { useCallback, useEffect, useState } from "react"

import { exportTradingDatabaseJson, readTradingDatabase } from "@/lib/trading/localTradingDatabase"
import type { TradingDatabaseSnapshot } from "@/lib/trading/types"

export function useTradingDatabase() {
  const [snapshot, setSnapshot] = useState<TradingDatabaseSnapshot | null>(null)

  const refresh = useCallback(() => {
    setSnapshot(readTradingDatabase())
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 10_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const exportJson = useCallback(() => exportTradingDatabaseJson(), [])

  return { snapshot, refresh, exportJson }
}
