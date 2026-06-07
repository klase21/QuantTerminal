import { NewsItem }
  from "./types"

export function normalizeNews(
  news: NewsItem[]
): NewsItem[] {

  return news.map((item) => ({

    ...item,

    title:
      item.title
        .replace(/\s+/g, " ")
        .trim(),
  }))
}