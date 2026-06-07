"use client"

import { useEffect, useRef, useState } from "react"

import { safeFetchJson, type SafeFetchResult } from "@/lib/runtime/safeFetch"

type PollState<T> = {
  data: T | null
  error: string | null
  loading: boolean
  lastUpdatedAt: string | null
  lastResult: SafeFetchResult<T> | null
}

export function useSafePolling<T>(url: string, refreshMs = 30000, options: { timeoutMs?: number; retries?: number; label?: string; enabled?: boolean } = {}) {
  const [state, setState] = useState<PollState<T>>({
    data: null,
    error: null,
    loading: true,
    lastUpdatedAt: null,
    lastResult: null,
  })
  const inFlight = useRef(false)
  const lastStartedAt = useRef(0)

  useEffect(() => {
    if (options.enabled === false) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null
    const controller = new AbortController()

    async function load() {
      const now = Date.now()
      if (inFlight.current) return
      if (now - lastStartedAt.current < Math.min(refreshMs * 0.5, 1500)) return
      inFlight.current = true
      lastStartedAt.current = now
      setState((prev) => ({ ...prev, loading: prev.data === null }))
      const result = await safeFetchJson<T>(url, {
        signal: controller.signal,
        timeoutMs: options.timeoutMs ?? 8000,
        retries: options.retries ?? 1,
        label: options.label ?? url,
        cache: "no-store",
      })
      inFlight.current = false
      if (!alive) return
      setState((prev) => ({
        data: result.ok ? result.data : prev.data,
        error: result.ok ? null : result.error,
        loading: false,
        lastUpdatedAt: result.ok ? new Date().toISOString() : prev.lastUpdatedAt,
        lastResult: result,
      }))
    }

    load()
    timer = setInterval(load, refreshMs)
    return () => {
      alive = false
      controller.abort()
      if (timer) clearInterval(timer)
    }
  }, [url, refreshMs, options.timeoutMs, options.retries, options.label, options.enabled])

  return state
}
