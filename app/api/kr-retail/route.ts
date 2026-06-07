import { NextResponse } from "next/server"

import { deriveKRRetailReaction } from "@/core/krRetail/deriveKRRetailReaction"
import type { CoinnessBreakingNewsItem, SaveTickerNewsItem } from "@/core/krRetail/krRetailTypes"

const SAVETICKER_URL = "https://www.saveticker.com/api/news/list?page=1&page_size=20&sort=created_at_desc&label_group=2&label_name=6"
const COINNESS_URL = "https://api.coinness.com/feed/v1/breaking-news?languageCode=ko&limit=25"
const TIMEOUT_MS = 8000

async function fetchJsonWithTimeout(url: string, source: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json,text/plain,*/*",
        "user-agent": `QuantTerminal/1.0 KR Retail Intelligence Layer (${source})`,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false as const, source, error: `${source} returned ${response.status}`, payload: null }
    }

    return { ok: true as const, source, error: null, payload: await response.json() }
  } catch (error) {
    return { ok: false as const, source, error: error instanceof Error ? error.message : String(error), payload: null }
  } finally {
    clearTimeout(timer)
  }
}

function extractCoinnessItems(payload: unknown): CoinnessBreakingNewsItem[] {
  const value = payload as Record<string, unknown> | null
  if (!value) return []
  const candidates = [
    value.data,
    value.items,
    value.list,
    value.news,
    value.news_list,
    value.result,
  ]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate as CoinnessBreakingNewsItem[]
  }
  if (Array.isArray(payload)) return payload as CoinnessBreakingNewsItem[]
  return []
}

export async function GET() {
  const [saveTickerResult, coinnessResult] = await Promise.all([
    fetchJsonWithTimeout(SAVETICKER_URL, "saveticker"),
    fetchJsonWithTimeout(COINNESS_URL, "coinness"),
  ])

  const saveTickerPayload = saveTickerResult.payload as { news_list?: SaveTickerNewsItem[]; total_count?: number } | null
  const saveTickerItems = Array.isArray(saveTickerPayload?.news_list) ? saveTickerPayload.news_list : []
  const coinnessItems = extractCoinnessItems(coinnessResult.payload)
  const surface = deriveKRRetailReaction(saveTickerItems, coinnessItems)

  return NextResponse.json({
    ok: surface.ok,
    source: surface.source,
    fetchedAt: new Date().toISOString(),
    totalCount: {
      saveticker: saveTickerPayload?.total_count ?? saveTickerItems.length,
      coinness: coinnessItems.length,
    },
    connectors: {
      saveticker: { ok: saveTickerResult.ok, error: saveTickerResult.error },
      coinness: { ok: coinnessResult.ok, error: coinnessResult.error },
    },
    surface,
  })
}
