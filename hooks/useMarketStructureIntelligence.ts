"use client"

import { useEffect, useRef, useState } from "react"

import type { MarketStructureIntelligenceResponse } from "@/core/market-structure/marketStructureTypes"

export function useMarketStructureIntelligence(intervalMs = 30000) {
  const [data, setData] = useState<MarketStructureIntelligenceResponse | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "connected" | "partial" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      if (typeof document !== "undefined" && document.hidden) return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStatus((previous) => (previous === "idle" ? "loading" : previous))
      try {
        const response = await fetch("/api/intelligence/market-structure", {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`market structure returned ${response.status}`)
        const payload = (await response.json()) as MarketStructureIntelligenceResponse
        if (!alive) return
        setData(payload)
        setStatus(payload.mode === "partial" ? "partial" : "connected")
        setError(null)
      } catch (caught) {
        if (!alive || controller.signal.aborted) return
        setStatus("error")
        setError(caught instanceof Error ? caught.message : String(caught))
      }
    }

    load()
    const timer = window.setInterval(load, intervalMs)
    return () => {
      alive = false
      window.clearInterval(timer)
      abortRef.current?.abort()
    }
  }, [intervalMs])

  return { data, status, error }
}
