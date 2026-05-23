"use client"

import { useEffect, useRef, useState } from "react"
import type { FuturesIntelligenceResponse } from "@/core/futuresTypes"

type FeedStatus = "idle" | "loading" | "live" | "stale" | "error"

export function useFuturesIntelligenceFeed(intervalMs = 30000) {
  const [data, setData] = useState<FuturesIntelligenceResponse | null>(null)
  const [status, setStatus] = useState<FeedStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      if (document.visibilityState === "hidden") return
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        setStatus((prev) => (prev === "live" ? "stale" : "loading"))
        const response = await fetch("/api/market/futures-intelligence", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = (await response.json()) as FuturesIntelligenceResponse
        if (!alive) return
        setData(payload)
        setStatus(response.ok && payload.ok ? "live" : "error")
        setError(response.ok ? null : payload.notes?.[0] ?? `futures feed returned ${response.status}`)
      } catch (err) {
        if (!alive || controller.signal.aborted) return
        setStatus("error")
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    load()
    const timer = setInterval(load, intervalMs)
    return () => {
      alive = false
      abortRef.current?.abort()
      clearInterval(timer)
    }
  }, [intervalMs])

  return { data, status, error }
}
