// ======================================================
// lib/news/fetchers/fetchCointelegraph.ts
// ======================================================

import { NewsItem }
  from "../types"

export async function fetchCointelegraphNews():
Promise<NewsItem[]> {

  try {

    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss",
      {
        next: {
          revalidate: 60,
        },
      }
    )

    const json =
      await res.json()

    const items =
      json?.items || []

    return items.map(
      (item: any) => ({

        id:
          `ct-${item.guid}`,

        title:
          item.title || "",

        translatedTitle:
          item.title || "",

        url:
          item.link || "#",

        source:
          "Cointelegraph",

        timestamp:
          item.pubDate
            ? new Date(
                item.pubDate
              ).getTime()
            : Date.now(),

        sentiment:
          "neutral",

        tags: [
          "cointelegraph",
        ],

      })
    )

  } catch (err) {

    console.error(
      "CT FETCH ERROR:",
      err
    )

    return []

  }

}