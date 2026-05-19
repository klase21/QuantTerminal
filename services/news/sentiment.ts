import {
  bullishKeywords,
  bearishKeywords,
} from "./keywords"

import { Sentiment } from "./types"

export function detectSentiment(
  title: string
): Sentiment {
  const lower = title.toLowerCase()

  const bullish = bullishKeywords.some(k =>
    lower.includes(k)
  )

  const bearish = bearishKeywords.some(k =>
    lower.includes(k)
  )

  if (bullish) return "bullish"

  if (bearish) return "bearish"

  return "neutral"
}