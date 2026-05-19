export type NewsRegion = "KR" | "CN" | "EN"

export type Sentiment =
  | "bullish"
  | "bearish"
  | "neutral"

export interface NewsItem {
  id: string

  source: string
  region: NewsRegion

  title: string
  translatedTitle?: string

  url: string

  publishedAt: number

  sentiment?: Sentiment

  tags?: string[]
}