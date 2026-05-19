import {
  bullishKeywords,
  bearishKeywords,
} from "./keywords"

import { Sentiment } from "./types"

export function detectSentiment(
  title: string
): {
  score: number
  sentiment: Sentiment
  tags: string[]
} {
  const lower = title.toLowerCase()

  let score = 0
  const tags: string[] = []

  bullishKeywords.forEach((item) => {
    if (
      lower.includes(item.keyword)
    ) {
      score += item.score
      tags.push(item.keyword)
    }
  })

  bearishKeywords.forEach((item) => {
    if (
      lower.includes(item.keyword)
    ) {
      score += item.score
      tags.push(item.keyword)
    }
  })

  let sentiment: Sentiment =
    "neutral"

  if (score >= 5) {
    sentiment = "strong_bullish"
  } else if (score > 0) {
    sentiment = "bullish"
  } else if (score <= -5) {
    sentiment = "strong_bearish"
  } else if (score < 0) {
    sentiment = "bearish"
  }

  return {
    score,
    sentiment,
    tags,
  }
}