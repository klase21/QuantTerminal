// ======================================================
// lib/news/narrativeTags.ts
// NEWS TITLE / TAG NARRATIVE DETECTOR
// ======================================================

import { NARRATIVE_KEYWORDS } from "@/lib/news/narrativeKeywords"

export function detectNarratives(
  input: string,
  extraText: string[] = []
) {
  const text = [input, ...extraText]
    .join(" ")
    .toLowerCase()

  return Object.entries(NARRATIVE_KEYWORDS)
    .filter(([, keywords]) =>
      keywords.some((keyword) =>
        text.includes(keyword.toLowerCase())
      )
    )
    .map(([narrative]) => narrative)
}
