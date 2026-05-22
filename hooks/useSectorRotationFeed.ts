"use client"

import { useEffect, useRef, useState } from "react"

import type { RealMarketRotationResponse } from "@/core/marketDataTypes"

export type SectorRotationFeedStatus = "idle" | "loading" | "live" | "partial" | "error"

const DEFAULT_POLL_MS = 10000

export function useSectorRotationFeed(pollMs = DEFAULT_POLL_MS) {
  const [data, setData] = useState<RealMarketRotationResponse | null>(null)
  const [status, setStatus] = useState<SectorRotationFeedStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [pulse, setPulse] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!data) setStatus("loading")

      try {
        const response = await fetch("/api/market/sector-rotation", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload = (await response.json()) as RealMarketRotationResponse
        if (!alive) return

        if (!response.ok || payload.ok === false) {
          throw new Error(payload.notes?.[0] ?? `sector rotation returned ${response.status}`)
        }

        setData(payload)
        setStatus(payload.mode === "partial" || payload.dataQuality?.status === "partial" ? "partial" : "live")
        setError(null)
        setPulse((value) => value + 1)
      } catch (err) {
        if (!alive) return
        if (err instanceof DOMException && err.name === "AbortError") return
        setStatus("error")
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    load()
    timer = setInterval(load, pollMs)

    return () => {
      alive = false
      abortRef.current?.abort()
      if (timer) clearInterval(timer)
    }
  }, [pollMs])

  return { data, status, error, pulse }
}
