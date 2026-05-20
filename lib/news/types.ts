// ======================================================
// lib/news/types.ts
// ======================================================

export type Sentiment =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish"

export type NewsRegion =
  | "kr"
  | "cn"
  | "en"

export interface NewsItem {
  id: string
  title: string
  translatedTitle?: string
  url: string
  source: string
  timestamp?: number
  publishedAt?: string
  sentiment?: Sentiment
  tags?: string[]
  narratives?: string[]
  importance?: number
  sourceWeight?: number
  region?: NewsRegion
}
