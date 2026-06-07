// ======================================================
// CoinDesk RSS
// ======================================================

import Parser from "rss-parser"

import { NewsItem }
  from "@/lib/news/types"

const parser =
  new Parser()

export async function fetchCoinDeskNews():
Promise<NewsItem[]> {

  try {

    const feed =
      await parser.parseURL(
        "https://www.coindesk.com/arc/outboundfeeds/rss/"
      )

    return (
      feed.items || []
    ).slice(0, 15).map((item) => ({

      id:
        `coindesk-${item.guid}`,

      title:
        item.title || "",

      translatedTitle:
        item.title || "",

      url:
        item.link || "#",

      source:
        "CoinDesk",

      timestamp:
        item.pubDate
          ? new Date(
              item.pubDate
            ).getTime()
          : Date.now(),

      sentiment:
        "neutral",

      tags: [],

    }))

  } catch {

    return []

  }

}