"use client"

import {
  useEffect,
  useState,
} from "react"

export function useNewsFeed() {
  const [news, setNews] = useState([])

  const [loading, setLoading] =
    useState(true)

  async function loadNews() {
    try {
      const response = await fetch(
        "/api/news"
      )

      const data = await response.json()

      setNews(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()

    const interval = setInterval(
      loadNews,
      30000
    )

    return () => clearInterval(interval)
  }, [])

  return {
    news,
    loading,
  }
}