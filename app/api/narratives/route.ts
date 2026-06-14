// ======================================================
// app/api/narratives/route.ts
// CROSS-REGION NARRATIVE INTELLIGENCE API
// ======================================================

export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"

import { aggregateNews } from "@/lib/news/aggregateNews"
import { detectSentiment } from "@/lib/news/detectSentiment"
import { detectNarratives } from "@/lib/news/narrativeTags"
import {
  buildNarrativeHeatmap,
  getRegionalLeaders,
} from "@/lib/news/narrativeHeatmap"
import {
  calculateAverageDivergence,
  getTopDivergenceRows,
} from "@/lib/news/narrativeDivergence"
import { fetchGdeltNarrativeNews } from "@/lib/data-sources/gdeltClient"

const REGION_SOURCE_WEIGHT: Record<string, number> = {
  kr: 1.5,
  cn: 1.5,
  en: 1.2,
}

type Region = "kr" | "cn" | "en"

function getTimestamp(item: any) {
  return (
    Number(item.timestamp || 0) ||
    new Date(item.publishedAt || 0).getTime() ||
    Date.now()
  )
}

function getRangeHours(value: string | null) {
  if (value === "1h") return 1
  if (value === "3h") return 3
  if (value === "6h") return 6
  if (value === "12h") return 12
  if (value === "24h") return 24
  if (value === "7d") return 24 * 7

  return 24
}

async function loadRegion(region: Region) {
  const raw = await aggregateNews(region)

  return raw.map((item: any, idx: number) => {
    const title = item.title || ""
    const tags = item.tags || []
    const timestamp = getTimestamp(item)

    return {
      id:
        item.id ||
        `${region}-${item.source || "unknown"}-${idx}`,
      title,
      translatedTitle: item.translatedTitle || title,
      url: item.url || "#",
      source: item.source || "Unknown",
      timestamp,
      sentiment:
        item.sentiment ||
        detectSentiment(title),
      tags,
      narratives: detectNarratives(title, tags),
      importance: item.importance || 0,
      sourceWeight:
        item.sourceWeight ||
        REGION_SOURCE_WEIGHT[region] ||
        1,
      region,
    }
  })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const rangeHours = getRangeHours(searchParams.get("range"))
    const since = Date.now() - rangeHours * 36e5

    const [kr, cn, en, gdeltResult] = await Promise.allSettled([
      loadRegion("kr"),
      loadRegion("cn"),
      loadRegion("en"),
      fetchGdeltNarrativeNews(),
    ])

    const krItems = kr.status === "fulfilled" ? kr.value : []
    const cnItems = cn.status === "fulfilled" ? cn.value : []
    const enItems = en.status === "fulfilled" ? en.value : []
    const gdeltItems = gdeltResult.status === "fulfilled" ? gdeltResult.value : []

    const items = [...krItems, ...cnItems, ...enItems, ...gdeltItems]
      .filter((item) => item.timestamp >= since)
      .filter((item) => item.narratives.length > 0)

    const heatmap = buildNarrativeHeatmap(items)
    const topDivergence = getTopDivergenceRows(heatmap, 5)
    const regionalLeaders = getRegionalLeaders(heatmap)

    return NextResponse.json({
      range: `${rangeHours}h`,
      updatedAt: Date.now(),
      sources: [
        ...(krItems.length || cnItems.length || enItems.length ? ["existing-news-feeds"] : []),
        ...(gdeltItems.length ? ["gdelt-doc"] : []),
      ],
      counts: {
        kr: krItems.length,
        cn: cnItems.length,
        en: enItems.length,
        gdelt: gdeltItems.length,
        tagged: items.length,
      },
      heatmap,
      topNarratives: heatmap
        .slice(0, 5)
        .map((row) => row.narrative),
      regionalLeaders,
      divergenceScore: calculateAverageDivergence(heatmap),
      topDivergence,
    })
  } catch (err) {
    console.error("NARRATIVES API ERROR:", err)

    return NextResponse.json(
      {
        range: "24h",
        updatedAt: Date.now(),
        counts: {
          kr: 0,
          cn: 0,
          en: 0,
          tagged: 0,
        },
        heatmap: [],
        topNarratives: [],
        regionalLeaders: {
          kr: "None",
          cn: "None",
          en: "None",
        },
        divergenceScore: 0,
        topDivergence: [],
      },
      { status: 500 }
    )
  }
}
