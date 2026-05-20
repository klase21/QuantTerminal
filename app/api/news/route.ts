// ======================================================
// app/api/news/route.ts
// REGION-SAFE NARRATIVE INTELLIGENCE FEED
// ======================================================

export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"

import { aggregateNews } from "@/lib/news/aggregateNews"
import { detectSentiment } from "@/lib/news/detectSentiment"
import { rankNews } from "@/lib/news/rankNews"
import { translateNews } from "@/lib/news/translateNews"

type Region = "kr" | "en" | "cn"
type TargetLang = "ko" | "en" | "zh"

const SOURCE_WEIGHT: Record<string, number> = {
  // CHINA
  jinse: 1.5,
  panews: 1.4,
  odaily: 1.4,
  wu: 1.6,
  wublockchain: 1.7,
  "金色": 1.5,

  // KOREA
  coinness: 1.5,
  "코인니스": 1.5,
  blockmedia: 1.3,
  "block media": 1.3,
  decenter: 1.2,
  coindeskkorea: 1.2,
  "coindesk korea": 1.2,
  digitalasset: 1.2,
  "digital asset": 1.2,
  "블록미디어": 1.3,
  "코인데스크코리아": 1.2,
  "디지털애셋": 1.2,
  "디센터": 1.2,

  // GLOBAL
  coindesk: 1.2,
  cointelegraph: 1.1,
  decrypt: 1.0,
  "the block": 1.3,
  theblock: 1.3,
  dlnews: 1.2,
}

const REGION_SOURCES: Record<Region, string[]> = {
  cn: [
    "jinse",
    "金色",
    "panews",
    "odaily",
    "wu",
    "wublockchain",
  ],

  kr: [
    "coinness",
    "코인니스",
    "blockmedia",
    "block media",
    "coindeskkorea",
    "coindesk korea",
    "digitalasset",
    "digital asset",
    "decenter",
    "디센터",
    "블록미디어",
    "코인데스크코리아",
    "디지털애셋",
  ],

  en: [
    "coindesk",
    "cointelegraph",
    "decrypt",
    "the block",
    "theblock",
    "dlnews",
  ],
}

function normalizeSource(source: string) {
  return source.toLowerCase().trim()
}

function matchRegionSource(
  source: string,
  region: Region
) {
  const normalized = normalizeSource(source)

  const allowedSources =
    REGION_SOURCES[region]

  return allowedSources.some((s) =>
    normalized.includes(s.toLowerCase())
  )
}

function getSourceWeight(source: string) {
  const normalized = normalizeSource(source)

  for (const key of Object.keys(SOURCE_WEIGHT)) {
    if (normalized.includes(key.toLowerCase())) {
      return SOURCE_WEIGHT[key]
    }
  }

  return 1
}

function getValidRegion(value: string | null): Region {
  if (value === "kr" || value === "cn" || value === "en") {
    return value
  }

  return "en"
}

function getValidTarget(value: string | null): TargetLang {
  if (value === "ko" || value === "zh" || value === "en") {
    return value
  }

  return "ko"
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const region = getValidRegion(
      searchParams.get("region")
    )

    const target = getValidTarget(
      searchParams.get("target")
    )

    const shouldTranslate =
      searchParams.get("translate") !== "false"

    const raw = await aggregateNews(region)

    if (!Array.isArray(raw)) {
      return NextResponse.json([])
    }

    // ======================================================
    // STRICT REGION FILTER
    // 핵심:
    // regionFiltered가 비어도 raw fallback 금지
    // 그래야 KR에 Jinse가 섞이지 않음
    // ======================================================

    const sourceItems = raw.filter((item: any) =>
      matchRegionSource(
        String(item.source || ""),
        region
      )
    )

    const translated = await Promise.all(
      sourceItems.map(async (item: any, idx: number) => {
        const title = item.title || ""

        let translatedTitle = title

        try {
          translatedTitle =
            shouldTranslate
              ? await translateNews(title, target)
              : title
        } catch (err) {
          console.error("TRANSLATE ERROR:", err)
          translatedTitle = title
        }

        const weight = getSourceWeight(
          item.source || ""
        )

        return {
          id:
            item.id ||
            `${region}-${item.source || "unknown"}-${idx}`,

          title,

          translatedTitle,

          url:
            item.url || "#",

          source:
            item.source || "Unknown",

          timestamp:
            item.timestamp || Date.now(),

          sentiment:
            item.sentiment ||
            detectSentiment(title),

          tags:
            item.tags || [],

          importance:
            (item.importance || 0) * weight,

          sourceWeight:
            weight,

          region,
        }
      })
    )

    const ranked = rankNews(translated)

    return NextResponse.json(ranked)
  } catch (err) {
    console.error("NEWS API ERROR:", err)

    return NextResponse.json([])
  }
}