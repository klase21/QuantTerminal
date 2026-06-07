"use client"

import {
  useEffect,
  useState,
} from "react"

import {
  MACRO_TICKER_FALLBACK,
  MacroTickerItem,
} from "@/lib/macroTicker"
import { safeFetchJson } from "@/lib/runtime/safeFetch"

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
      const result = await safeFetchJson<{ items?: MacroTickerItem[] }>("/api/macro", {
        timeoutMs: 7000,
        retries: 1,
        label: "macro ticker",
      })

      if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Macro ticker failed")
      }

      const json = result.data

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
