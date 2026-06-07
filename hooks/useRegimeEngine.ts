"use client"

import { useEffect } from "react"
import { useMarketStore } from "@/stores/useMarketStore"
import { useRegimeStore } from "@/stores/useRegimeStore"
import { useRotationStore } from "@/stores/useRotationStore"
import { normalizeUpbitDataLabSnapshot } from "@/core/upbit-datalab/normalize"

export default function useRegimeEngine() {
  const tickers = useMarketStore((state) => state.tickers)
  const updateRotation = useRotationStore((state) => state.update)
  const sectorScores = useRotationStore((state) => state.scoredSectors)
  const updateRegimeSectors = useRegimeStore((state) => state.updateSectors)
  const updateSnapshot = useRegimeStore((state) => state.updateSnapshot)

  useEffect(() => {
    const frames = Object.values(tickers)
    if (frames.length === 0) return
    updateRotation(frames)
  }, [tickers, updateRotation])

  useEffect(() => {
    updateRegimeSectors(sectorScores)
  }, [sectorScores, updateRegimeSectors])

  useEffect(() => {
    let cancelled = false

    async function loadSnapshot() {
      try {
        const res = await fetch("/api/upbit-datalab/snapshot", {
          cache: "no-store",
        })
        const json = await res.json()
        if (cancelled) return
        updateSnapshot(normalizeUpbitDataLabSnapshot(json?.snapshot || json))
      } catch (error) {
        if (!cancelled) {
          updateSnapshot(normalizeUpbitDataLabSnapshot({}))
        }
      }
    }

    loadSnapshot()
    const interval = window.setInterval(loadSnapshot, 60_000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [updateSnapshot])
}
