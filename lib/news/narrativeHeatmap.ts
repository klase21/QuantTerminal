// ======================================================
// lib/news/narrativeHeatmap.ts
// HEATMAP AGGREGATION
// ======================================================

import { NARRATIVE_NAMES } from "@/lib/news/narrativeKeywords"
import {
  NarrativeNewsItem,
  NarrativeRegion,
  scoreNarrativeItem,
} from "@/lib/news/narrativeScore"

export interface NarrativeHeatmapRow {
  narrative: string
  kr: number
  cn: number
  en: number
  total: number
  divergence: number
}

export function buildNarrativeHeatmap(
  items: NarrativeNewsItem[]
): NarrativeHeatmapRow[] {
  const scores: Record<string, Record<NarrativeRegion, number>> = {}

  for (const narrative of NARRATIVE_NAMES) {
    scores[narrative] = {
      kr: 0,
      cn: 0,
      en: 0,
    }
  }

  for (const item of items) {
    const region = item.region

    if (!region) continue

    const narratives = item.narratives || []
    const score = scoreNarrativeItem(item)

    for (const narrative of narratives) {
      if (!scores[narrative]) {
        scores[narrative] = {
          kr: 0,
          cn: 0,
          en: 0,
        }
      }

      scores[narrative][region] += score
    }
  }

  return Object.entries(scores)
    .map(([narrative, value]) => {
      const kr = Math.min(100, Math.round(value.kr))
      const cn = Math.min(100, Math.round(value.cn))
      const en = Math.min(100, Math.round(value.en))
      const values = [kr, cn, en]
      const max = Math.max(...values)
      const min = Math.min(...values)

      return {
        narrative,
        kr,
        cn,
        en,
        total: kr + cn + en,
        divergence: max - min,
      }
    })
    .filter((row) => row.total > 0)
    .sort((a, b) =>
      b.total === a.total
        ? b.divergence - a.divergence
        : b.total - a.total
    )
}

export function getRegionalLeaders(rows: NarrativeHeatmapRow[]) {
  const getLeader = (region: NarrativeRegion) => {
    const top = [...rows]
      .filter((row) => row[region] > 0)
      .sort((a, b) => b[region] - a[region])[0]

    return top?.narrative || "None"
  }

  return {
    kr: getLeader("kr"),
    cn: getLeader("cn"),
    en: getLeader("en"),
  }
}
