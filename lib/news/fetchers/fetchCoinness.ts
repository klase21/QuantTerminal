// ======================================================
// lib/news/fetchers/fetchCoinness.ts
// ======================================================

import { NewsItem } from "../types"

export async function fetchCoinnessNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      "https://api.coinness.com/feed/v1/breaking-news?languageCode=ko&limit=25",
      {
        cache: "no-store",
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0",
        },
      }
    )

    if (!res.ok) {
      console.error(
        "COINNESS HTTP ERROR:",
        res.status,
        res.statusText
      )

      return []
    }

    const json = await res.json()

    const list =
      Array.isArray(json)
        ? json
        : json?.data?.list ||
          json?.data ||
          json?.list ||
          json?.items ||
          []

    if (!Array.isArray(list)) {
      console.error(
        "COINNESS LIST IS NOT ARRAY:",
        list
      )

      return []
    }

    return list.map((item: any) => {
      const title = item.title || ""

      const timestamp =
        item.publishAt
          ? new Date(item.publishAt).getTime()
          : item.createdAt
            ? new Date(item.createdAt).getTime()
            : item.created_at
              ? new Date(item.created_at).getTime()
              : Date.now()

      return {
        id: `coinness-${item.id}`,

        title,

        translatedTitle: title,

        url:
          item.link ||
          `https://coinness.com/news/${item.id}`,

        source: "Coinness",

        timestamp,

        sentiment: "neutral",

        tags: [
          "coinness",
          item.quickOrderCode,
          ...(item.originCodes || []),
        ].filter(Boolean),

        importance:
          item.isImportant ? 10 : 0,

        sourceWeight: 1.5,

        region: "kr",
      }
    })
  } catch (err) {
    console.error(
      "COINNESS FETCH ERROR:",
      err
    )

    return []
  }
}