"use client"

import { useEffect, useState } from "react"

import type { AIIntelligenceLayerSurface } from "@/core/ai-intelligence/aiIntelligenceTypes"

export function useAIIntelligenceLayer(refreshMs = 45000) {
  const [data, setData] = useState<AIIntelligenceLayerSurface | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function load() {
      try {
        setError(null)
        const response = await fetch("/api/intelligence/ai-layer", { cache: "no-store" })
        if (!response.ok) throw new Error(`AI intelligence returned ${response.status}`)
        const payload = await response.json() as AIIntelligenceLayerSurface
        if (alive) setData(payload)
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    timer = setInterval(load, refreshMs)
    return () => {
      alive = false
      if (timer) clearInterval(timer)
    }
  }, [refreshMs])

  return { data, error, loading }
}
