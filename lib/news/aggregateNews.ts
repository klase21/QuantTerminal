// ======================================================
// lib/news/aggregateNews.ts
// ======================================================

import { fetchJinseNews }
  from "@/lib/news/fetchers/fetchJinse"

import { fetchCoinDeskNews }
  from "@/lib/news/fetchers/fetchCoinDesk"

import { fetchCointelegraphNews }
  from "@/lib/news/fetchers/fetchCointelegraph"

import { fetchDecryptNews }
  from "@/lib/news/fetchers/fetchDecrypt"

import { fetchCoinnessNews }
  from "@/lib/news/fetchers/fetchCoinness"

export async function aggregateNews() {

  const results =
    await Promise.allSettled([

      fetchJinseNews(),

      fetchCoinDeskNews(),

      fetchCointelegraphNews(),

      fetchDecryptNews(),

      fetchCoinnessNews(),

    ])

  const merged =
    results.flatMap((r) => {

      if (
        r.status === "fulfilled"
      ) {

        return r.value

      }

      console.error(
        "NEWS FETCH FAILED:",
        r.reason
      )

      return []

    })

  return merged.sort(

    (a: any, b: any) =>

      new Date(
        b.publishedAt || 0
      ).getTime()

      -

      new Date(
        a.publishedAt || 0
      ).getTime()

  )

}