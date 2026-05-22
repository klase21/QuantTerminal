// ======================================================
// lib/news/fetchers/fetchJinse.ts
// ======================================================

import { NewsItem }
  from "../types"

export async function fetchJinseNews():
Promise<NewsItem[]> {

  try {

    const res = await fetch(

      "https://api.jinse2.com/noah/v2/lives?limit=20",

      {
        cache: "no-store",

        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0",
        },
      }

    )

    if (!res.ok) {

      throw new Error(
        `HTTP ${res.status}`
      )

    }

    const json =
      await res.json()

    // ======================================================
    // REAL API STRUCTURE
    // ======================================================

    const groups =
      json?.list || []

    const lives =
      groups.flatMap(
        (g: any) =>
          g?.lives || []
      )


    return lives

      // Remove empty content items.
      .filter(
        (item: any) =>
          item?.content ||
          item?.content_prefix
      )

      .map(
        (item: any) => ({

          id:
            `jinse-${item.id}`,

          title:
            item.content_prefix ||
            item.content ||
            "",

          url:
            item.link ||
            `https://jinse2.com/lives/${item.id}`,

          source:
            "Jinse",

          publishedAt:
            item.created_at
              ? new Date(
                  item.created_at * 1000
                ).toISOString()
              : new Date().toISOString(),

          timestamp:
            item.created_at
              ? item.created_at * 1000
              : Date.now(),

          sentiment:
            "neutral",

          tags:
            ["jinse"],

          importance:
            0,

          sourceWeight:
            1.5,

          region:
            "cn",

        })
      )

  } catch (err) {

    void err

    return []

  }

}