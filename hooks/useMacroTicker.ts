"use client"

import {
  useEffect,
  useState,
} from "react"

import {
  MACRO_TICKER_FALLBACK,
  MacroTickerItem,
} from "@/lib/macroTicker"

const REFRESH_MS = 30_000

export default function useMacroTicker() {
  const [items, setItems] =
    useState<MacroTickerItem[]>(
      MACRO_TICKER_FALLBACK
    )

  const [loading, setLoading] =
    useState(true)

  async function load() {
    try {
      const res =
        await fetch("/api/macro", {
          cache: "no-store",
        })

      if (!res.ok) {
        throw new Error(
          `Macro ticker failed: ${res.status}`
        )
      }

      const json =
        await res.json()

      if (
        Array.isArray(json?.items) &&
        json.items.length > 0
      ) {
        setItems(json.items)
      }
    } catch (err) {
      console.error(
        "MACRO TICKER LOAD ERROR:",
        err
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const interval =
      window.setInterval(
        load,
        REFRESH_MS
      )

    return () =>
      window.clearInterval(interval)
  }, [])

  return {
    items,
    loading,
  }
}
