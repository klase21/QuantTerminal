// ======================================================
// lib/news/narrativeDivergence.ts
// CROSS-REGION DIVERGENCE HELPERS
// ======================================================

import { NarrativeHeatmapRow } from "@/lib/news/narrativeHeatmap"

export function calculateAverageDivergence(
  rows: NarrativeHeatmapRow[]
) {
  if (rows.length === 0) {
    return 0
  }

  const sum = rows.reduce(
    (acc, row) => acc + row.divergence,
    0
  )

  return Math.round(sum / rows.length)
}

export function getTopDivergenceRows(
  rows: NarrativeHeatmapRow[],
  limit = 5
) {
  return [...rows]
    .sort((a, b) => b.divergence - a.divergence)
    .slice(0, limit)
}
