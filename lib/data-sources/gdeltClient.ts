import { detectSentiment } from "@/lib/news/detectSentiment"
import { detectNarratives } from "@/lib/news/narrativeTags"

type GdeltArticle = {
  title?: string
  url?: string
  sourceCountry?: string
  domain?: string
  seendate?: string
  language?: string
}

type GdeltResponse = {
  articles?: GdeltArticle[]
}

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
const REQUEST_TIMEOUT_MS = 8000

const NARRATIVE_QUERY = [
  "bitcoin",
  "ethereum",
  "solana",
  "crypto etf",
  "stablecoin",
  "regulation",
  "tokenized assets",
  "depin",
  "artificial intelligence crypto",
  "meme coin",
].map((term) => `"${term}"`).join(" OR ")

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

function timestampFromGdelt(value?: string) {
  if (!value) return Date.now()
  const normalized = value.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})Z?$/, "$1-$2-$3T$4:$5:$6Z")
  const timestamp = new Date(normalized).getTime()
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

export async function fetchGdeltNarrativeNews() {
  const params = new URLSearchParams({
    query: NARRATIVE_QUERY,
    mode: "ArtList",
    format: "json",
    maxrecords: "75",
    sort: "HybridRel",
  })
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${GDELT_DOC_URL}?${params.toString()}`, {
      cache: "no-store",
      signal: timeout.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0",
      },
    })

    if (!response.ok) throw new Error(`GDELT returned ${response.status}`)

    const payload = await response.json() as GdeltResponse
    return (payload.articles ?? [])
      .map((article, index) => {
        const title = article.title?.trim() ?? ""
        const narratives = detectNarratives(title, [])
        if (!title || narratives.length === 0) return null

        return {
          id: `gdelt-${index}-${article.url ?? title}`,
          title,
          translatedTitle: title,
          url: article.url || "#",
          source: article.domain || "GDELT",
          timestamp: timestampFromGdelt(article.seendate),
          sentiment: detectSentiment(title),
          tags: [],
          narratives,
          importance: 1,
          sourceWeight: 1,
          region: "en" as const,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  } finally {
    timeout.cancel()
  }
}
