// ======================================================
// lib/news/fetchers/fetchCoinness.ts
// ======================================================

import { NewsItem }
  from "../types"

export async function fetchCoinnessNews():
Promise<NewsItem[]> {

  try {

    const res = await fetch(
      "https://api.coinness.com/feed/v1/breaking-news?languageCode=ko&limit=25",
      {
        cache: "no-store",
      }
    )

    const json =
      await res.json()

    const list =
      json?.data?.list || []

    return list.map(
      (item: any) => ({

        id:
          `coinness-${item.id}`,

        title:
          item.title || "",

        translatedTitle:
          item.title || "",

        url:
          item.link || "#",

        source:
          "Coinness",

        timestamp:
          item.created_at
            ? new Date(
                item.created_at
              ).getTime()
            : Date.now(),

        sentiment:
          "neutral",

        tags: [
          "coinness",
        ],

      })
    )

  } catch (err) {

    console.error(
      "COINNESS FETCH ERROR:",
      err
    )

    return []

  }

}