import * as cheerio from "cheerio"

import { detectSentiment } from "./sentiment"
import { NewsItem } from "./types"

export async function fetchCoinnessNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch(
      "https://coinness.com/article",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        cache: "no-store",
      }
    )

    const html = await response.text()

    const $ = cheerio.load(html)

    const news: NewsItem[] = []

    $("a").each((index, el) => {
      const title = $(el).text().trim()

      const href = $(el).attr("href")

      if (!title || !href) return

      if (title.length < 20) return

      news.push({
        id: `coinness-${index}`,

        source: "Coinness",
        region: "KR",

        title,

        url: href.startsWith("http")
          ? href
          : `https://coinness.com${href}`,

        publishedAt: Date.now(),

        sentiment: detectSentiment(title),
      })
    })

    return news.slice(0, 30)
  } catch (error) {
    console.error(error)

    return []
  }
}