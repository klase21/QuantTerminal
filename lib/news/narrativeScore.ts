// ======================================================
// lib/news/narrativeScore.ts
// REGIONAL NARRATIVE SCORING
// ======================================================

export type NarrativeRegion = "kr" | "cn" | "en"

export interface NarrativeNewsItem {
  id?: string
  title?: string
  translatedTitle?: string
  source?: string
  timestamp?: number
  sentiment?: string
  tags?: string[]
  narratives?: string[]
  importance?: number
  sourceWeight?: number
  region?: NarrativeRegion
}

const SENTIMENT_WEIGHT: Record<string, number> = {
  strong_bullish: 1.35,
  bullish: 1.15,
  neutral: 1,
  bearish: 0.9,
  strong_bearish: 0.8,
}

export function getRecencyMultiplier(timestamp?: number) {
  if (!timestamp) {
    return 0.75
  }

  const ageHours = Math.max(
    0,
    (Date.now() - timestamp) / 36e5
  )

  if (ageHours <= 1) return 1.35
  if (ageHours <= 3) return 1.2
  if (ageHours <= 6) return 1.05
  if (ageHours <= 12) return 0.9
  if (ageHours <= 24) return 0.75

  return 0.5
}

export function scoreNarrativeItem(item: NarrativeNewsItem) {
  const importance = Number(item.importance || 0)
  const sourceWeight = Number(item.sourceWeight || 1)
  const sentimentWeight =
    SENTIMENT_WEIGHT[item.sentiment || "neutral"] || 1

  const base = 12 + importance

  return Math.max(
    1,
    Math.round(
      base *
      sourceWeight *
      sentimentWeight *
      getRecencyMultiplier(item.timestamp)
    )
  )
}
