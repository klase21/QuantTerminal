// ======================================================
// lib/news/detectSentiment.ts
// ======================================================

import {
  bullishKeywords,
  bearishKeywords,
} from "./keywords"

import { Sentiment }
  from "./types"

export function detectSentiment(
  title: string
): Sentiment {

  const lower =
    title.toLowerCase()

  const bullish =
    bullishKeywords.some(
      (item) =>
        lower.includes(
          item.keyword.toLowerCase()
        )
    )

  const bearish =
    bearishKeywords.some(
      (item) =>
        lower.includes(
          item.keyword.toLowerCase()
        )
    )

  if (bullish)
    return "bullish"

  if (bearish)
    return "bearish"

  return "neutral"

}