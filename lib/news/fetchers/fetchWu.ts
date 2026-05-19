// ======================================================
// lib/news/fetchers/fetchWu.ts
// ======================================================

import { NewsItem }
  from "../types"

export async function fetchWuNews():
Promise<NewsItem[]> {

  try {

    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://wublock123.com/feed",
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
      (item: any, idx: number) => ({

        id:
          `wu-${idx}`,

        title:
          item.title || "",

        url:
          item.link || "",

        source:
          "WuBlockchain",

        publishedAt:
          item.pubDate ||
          new Date().toISOString(),

      })
    )

  } catch (err) {

    console.error(
      "WU FETCH ERROR:",
      err
    )

    return []

  }

}