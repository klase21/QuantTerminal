"use client"

import NewsCard from "./NewsCard"

import { useNewsFeed } from "@/hooks/useNewsFeed"

export default function NewsFeed() {
  const {
    news,
    loading,
  } = useNewsFeed()

  if (loading) {
    return (
      <div className="text-zinc-500">
        Loading news...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {news.map((item: any) => (
        <NewsCard
          key={item.id}
          item={item}
        />
      ))}
    </div>
  )
}