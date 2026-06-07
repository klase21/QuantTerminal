export type Sentiment =
  | "strong_bullish"
  | "bullish"
  | "neutral"
  | "bearish"
  | "strong_bearish"

export interface NewsItem {
  id: string
  title: string
  translatedTitle?: string
  url: string
  source: string
  timestamp: number

  score: number
  sentiment: Sentiment
  tags: string[]
}