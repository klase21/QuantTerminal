"use client"

import { useEffect, useState } from "react"

import { NewsItem } from "@/lib/news/types"

export function useNewsFeed() {
  const [news, setNews] = useState<
    NewsItem[]
  >([])

  const [loading, setLoading] =
    useState(true)

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch(
          "/api/news"
        )

        const data =
          await res.json()

        setNews(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchNews()

    const interval = setInterval(
      fetchNews,
      10000
    )

    return () =>
      clearInterval(interval)
  }, [])

  return {
    news,
    loading,
  }
}