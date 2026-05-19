import Parser from "rss-parser"

import { detectSentiment } from "./sentiment"
import { NewsItem } from "./types"

const parser = new Parser()

export async function fetchCoinDeskNews(): Promise<NewsItem[]> {
  const feed = await parser.parseURL(
    "https://www.coindesk.com/arc/outboundfeeds/rss/"
  )

  return feed.items.map((item, index) => ({
    id: `coindesk-${index}`,

    source: "CoinDesk",
    region: "EN",

    title: item.title || "",

    url: item.link || "",

    publishedAt: new Date(
      item.pubDate || Date.now()
    ).getTime(),

    sentiment: detectSentiment(
      item.title || ""
    ),
  }))
}