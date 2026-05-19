// ======================================================
// lib/news/fetchers/fetchDecrypt.ts
// ======================================================

import { NewsItem }
  from "../types"

export async function fetchDecryptNews():
Promise<NewsItem[]> {

  try {

    const res = await fetch(
      "https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed",
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
          `decrypt-${item.guid}`,

        title:
          item.title || "",

        translatedTitle:
          item.title || "",

        url:
          item.link || "#",

        source:
          "Decrypt",

        timestamp:
          item.pubDate
            ? new Date(
                item.pubDate
              ).getTime()
            : Date.now(),

        sentiment:
          "neutral",

        tags: [
          "decrypt",
        ],

      })
    )

  } catch (err) {

    console.error(
      "DECRYPT FETCH ERROR:",
      err
    )

    return []

  }

}