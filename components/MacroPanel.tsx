// ======================================================
// components/MacroPanel.tsx
// Compatibility wrapper for calculated liquidity panel
// ======================================================

"use client"

import {
  useEffect,
  useState,
} from "react"

import LiquidityIntelligencePanel
  from "@/components/macro/LiquidityIntelligencePanel"

export default function MacroPanel() {
  const [items, setItems] =
    useState<any[]>([])

  async function load() {
    try {
      const res =
        await fetch("/api/macro", {
          cache: "no-store",
        })

      const json =
        await res.json()

      setItems(
        Array.isArray(json)
          ? json
          : []
      )
    } catch (err) {
      console.error(
        "MACRO LIQUIDITY LOAD ERROR:",
        err
      )
    }
  }

  useEffect(() => {
    load()

    const interval =
      setInterval(load, 10000)

    return () =>
      clearInterval(interval)
  }, [])

  return (
    <LiquidityIntelligencePanel
      items={items}
    />
  )
}
