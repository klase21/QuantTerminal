import { NewsItem } from "./types"

export function dedupeNews(
  news: NewsItem[]
): NewsItem[] {

  const map = new Map<string, NewsItem>()

  for (const item of news) {

    const key =
      `${item.title}-${item.url}`

    if (!map.has(key)) {

      map.set(key, item)

    }
  }

  return Array.from(map.values())
}