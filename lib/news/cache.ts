import { NewsItem }
  from "./types"

interface NewsCache {

  data: NewsItem[]

  updatedAt: number
}

const CACHE_TTL =
  1000 * 30
// 30 seconds

let cache: NewsCache = {

  data: [],

  updatedAt: 0,
}

// ======================================================
// GET CACHE
// ======================================================

export function getNewsCache() {

  const now = Date.now()

  const isExpired =
    now - cache.updatedAt
    > CACHE_TTL

  return {

    data: cache.data,

    isExpired,
  }
}

// ======================================================
// SET CACHE
// ======================================================

export function setNewsCache(
  news: NewsItem[]
) {

  cache = {

    data: news,

    updatedAt:
      Date.now(),
  }
}