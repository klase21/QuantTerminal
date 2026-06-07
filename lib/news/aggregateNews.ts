// ======================================================
// lib/news/aggregateNews.ts
// REGION-AWARE AGGREGATOR
// ======================================================

import { fetchJinseNews } from "@/lib/news/fetchers/fetchJinse"
import { fetchCoinDeskNews } from "@/lib/news/fetchers/fetchCoinDesk"
import { fetchCointelegraphNews } from "@/lib/news/fetchers/fetchCointelegraph"
import { fetchDecryptNews } from "@/lib/news/fetchers/fetchDecrypt"
import { fetchCoinnessNews } from "@/lib/news/fetchers/fetchCoinness"

export type NewsRegion = "kr" | "cn" | "en"

export async function aggregateNews(
  region: NewsRegion = "en"
) {
  const fetchers =
    region === "cn"
      ? [fetchJinseNews]
      : region === "kr"
        ? [fetchCoinnessNews]
        : [
            fetchCoinDeskNews,
            fetchCointelegraphNews,
            fetchDecryptNews,
          ]

  const results =
    await Promise.allSettled(
      fetchers.map((fetcher) => fetcher())
    )

  const merged =
    results.flatMap((r) => {
      if (r.status === "fulfilled") {
        return r.value
      }

      console.error(
        "NEWS FETCH FAILED:",
        r.reason
      )

      return []
    })

  return merged.sort(
    (a: any, b: any) => {
      const bTime =
        Number(b.timestamp || 0) ||
        new Date(b.publishedAt || 0).getTime()

      const aTime =
        Number(a.timestamp || 0) ||
        new Date(a.publishedAt || 0).getTime()

      return bTime - aTime
    }
  )
}