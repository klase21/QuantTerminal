export type PredictionMarketEvent = {
  title: string
  venue: "Polymarket"
  probability: number
  volume: number | null
  liquidity: number | null
  openInterest: number | null
  lastUpdated: string | null
  source: "polymarket-gamma"
  url?: string
}

export type PredictionMarketsSnapshot = {
  ok: boolean
  source: "polymarket-gamma"
  updatedAt: string
  marketEvents: PredictionMarketEvent[]
  unavailableReason?: string
  diagnostics?: {
    totalFetched: number
    activeMarkets: number
    marketsWithVolume: number
    marketsWithLiquidity: number
    relevantMarkets: number
    probabilityFilteredMarkets: number
    finalMarkets: number
    excludedExamples: Array<{
      title: string
      reason: string
    }>
  }
}

type GammaMarket = {
  question?: string
  title?: string
  slug?: string
  active?: boolean
  closed?: boolean
  outcomes?: string[] | string
  outcomePrices?: string[] | string
  lastTradePrice?: number | string
  volume?: number | string
  volume24hr?: number | string
  volume1wk?: number | string
  volume1mo?: number | string
  liquidity?: number | string
  openInterest?: number | string
  updatedAt?: string
  endDate?: string
}

const GAMMA_MARKETS_URL = "https://gamma-api.polymarket.com/markets"
const REQUEST_TIMEOUT_MS = 8000
const PAGE_LIMIT = 100
const PAGE_OFFSETS = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

const RELEVANT_TERMS = [
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "solana",
  "sol",
  "crypto",
  "fed",
  "rate",
  "rate cut",
  "interest",
  "etf",
  "inflation",
  "recession",
  "stablecoin",
  "crypto regulation",
  "dxy",
  "dollar",
  "treasury",
  "yield",
  "nasdaq",
  "s&p",
  "spx",
]

const BLOCKED_TERMS = [
  "gta",
  "game",
  "gaming",
  "airdrop",
  "win",
  "champion",
  "league",
  "nba",
  "nfl",
  "mlb",
  "soccer",
  "football",
  "tennis",
  "ufc",
  "movie",
  "album",
  "celebrity",
  "netherlands",
  "election",
  "president",
  "mayor",
]

function timeoutSignal(ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(timer) }
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function titleForMarket(market: GammaMarket) {
  return market.question || market.title || market.slug || ""
}

function marketProbability(market: GammaMarket) {
  const outcomes = parseJsonArray(market.outcomes).map((item) => String(item).toLowerCase())
  const prices = parseJsonArray(market.outcomePrices).map((item) => Number(item))
  const yesIndex = outcomes.findIndex((outcome) => outcome === "yes")
  const selected = prices[yesIndex >= 0 ? yesIndex : 0]
  const fallback = Number(market.lastTradePrice)
  const value = Number.isFinite(selected) ? selected : fallback
  if (!Number.isFinite(value)) return null
  return value <= 1 ? value * 100 : value
}

function numericField(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function marketVolume(market: GammaMarket) {
  return numericField(market.volume24hr) ?? numericField(market.volume1wk) ?? numericField(market.volume)
}

function isRelevant(market: GammaMarket, query?: string) {
  const text = titleForMarket(market).toLowerCase()
  const normalizedQuery = query?.replace(/USDT$/i, "").toLowerCase()
  if (BLOCKED_TERMS.some((term) => text.includes(term))) return false
  if (normalizedQuery && text.includes(normalizedQuery)) return true
  return RELEVANT_TERMS.some((term) => text.includes(term))
}

function attentionScore(market: GammaMarket) {
  const volume = marketVolume(market) ?? 0
  const weeklyVolume = numericField(market.volume1wk) ?? 0
  const liquidity = numericField(market.liquidity) ?? 0
  const openInterest = numericField(market.openInterest) ?? 0
  const updatedAt = market.updatedAt ? new Date(market.updatedAt).getTime() : 0
  const ageHours = updatedAt ? Math.max(0, (Date.now() - updatedAt) / 36e5) : 72
  const recentActivity = Math.max(0, 72 - ageHours)

  return volume * 1.8 + weeklyVolume * 0.4 + liquidity * 1.2 + openInterest + recentActivity * 1000
}

function isExtremeButStructurallyImportant(market: GammaMarket) {
  const text = titleForMarket(market).toLowerCase()
  const volume = marketVolume(market) ?? 0
  const liquidity = numericField(market.liquidity) ?? 0
  const structurallyImportant = [
    "bitcoin etf",
    "ethereum etf",
    "eth etf",
    "btc etf",
    "recession",
    "fed cut",
    "rate cut",
    "inflation",
  ].some((term) => text.includes(term))

  return structurallyImportant && (volume >= 1_000_000 || liquidity >= 1_000_000)
}

function exclusionReason(market: GammaMarket, probability: number | null) {
  const text = titleForMarket(market).toLowerCase()
  if (probability === null) return "missing_probability"
  if (/\b(1[0-9]|[6-9])\s+fed\s+rate\s+cuts?\b/.test(text)) return "extreme_fed_cut_count"
  if (probability < 5 && !isExtremeButStructurallyImportant(market)) return "probability_below_5"
  if (probability > 95 && !isExtremeButStructurallyImportant(market)) return "probability_above_95"
  return null
}

function monthLabel(value: string) {
  const months: Record<string, string> = {
    january: "Jan",
    february: "Feb",
    march: "Mar",
    april: "Apr",
    may: "May",
    june: "Jun",
    july: "Jul",
    august: "Aug",
    september: "Sep",
    october: "Oct",
    november: "Nov",
    december: "Dec",
  }

  return months[value.toLowerCase()] ?? value
}

function contextFromTitle(title: string, endDate?: string) {
  const yearMatch = title.match(/\b(20\d{2})\b/)
  if (yearMatch) return yearMatch[1]

  const monthMatch = title.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i)
  if (monthMatch) return monthLabel(monthMatch[1])

  if (endDate) {
    const timestamp = new Date(endDate).getTime()
    if (Number.isFinite(timestamp)) return String(new Date(timestamp).getUTCFullYear())
  }

  return null
}

function shortTitle(title: string, endDate?: string) {
  const normalized = title
    .replace(/\?/g, "")
    .replace(/\bwill\b/gi, "")
    .replace(/\bby\b/gi, "")
    .replace(/\bbefore\b/gi, "")
    .replace(/\bin\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  const lower = normalized.toLowerCase()
  const context = contextFromTitle(normalized, endDate)
  if (lower.includes("bitcoin") && lower.includes("150")) return context ? `BTC ${context}: Above $150K` : "BTC Above $150K"
  if (lower.includes("bitcoin") && lower.includes("100")) return "BTC ABOVE 100K"
  if (lower.includes("bitcoin") && lower.includes("1m")) return "BTC $1M"
  if (lower.includes("bitcoin") && lower.includes("ath")) return "BTC ATH"
  if (lower.includes("ethereum") && lower.includes("etf")) return "ETH ETF"
  if (lower.includes("bitcoin") && lower.includes("etf")) return "BTC ETF"
  const fedCutCount = lower.match(/\b(\d+)\s+fed\s+rate\s+cuts?\b/)
  if (fedCutCount) return context ? `${context} Fed: ${fedCutCount[1]} ${fedCutCount[1] === "1" ? "Cut" : "Cuts"}` : fedCutCount[1] === "1" ? "1 Fed Cut" : `${fedCutCount[1]} Fed Cuts`
  if (lower.includes("no fed rate cuts")) return context ? `${context} Fed: No Cuts` : "No Fed Cuts"
  if (lower.includes("fed") && lower.includes("cut")) return context ? `${context} Fed Cut` : "Fed Rate Cut"
  if (lower.includes("recession")) return "RECESSION RISK"
  if (lower.includes("inflation")) return "INFLATION"

  return normalized
    .split(" ")
    .filter(Boolean)
    .slice(0, 5)
    .join(" ")
    .toUpperCase()
}

async function fetchMarketPage(offset: number, signal: AbortSignal) {
  const params = new URLSearchParams({
    active: "true",
    closed: "false",
    limit: String(PAGE_LIMIT),
    offset: String(offset),
  })

  const response = await fetch(`${GAMMA_MARKETS_URL}?${params.toString()}`, {
    cache: "no-store",
    signal,
    headers: {
      accept: "application/json",
      "user-agent": "QuantTerminal/1.0",
    },
  })

  if (!response.ok) throw new Error(`Polymarket returned ${response.status}`)
  const payload = await response.json()
  return Array.isArray(payload) ? payload as GammaMarket[] : []
}

export async function getPredictionMarkets(query?: string): Promise<PredictionMarketsSnapshot> {
  const timeout = timeoutSignal(REQUEST_TIMEOUT_MS)

  try {
    const payload = (await Promise.all(PAGE_OFFSETS.map((offset) => fetchMarketPage(offset, timeout.signal)))).flat()
    const bySlug = new Map<string, GammaMarket>()
    payload.forEach((market, index) => {
      bySlug.set(market.slug || titleForMarket(market) || `market-${index}`, market)
    })
    const markets = Array.from(bySlug.values())
    const activeMarkets = markets.filter((market) => market.active !== false && market.closed !== true)
    const relevantMarkets = activeMarkets.filter((market) => isRelevant(market, query))
    const diagnosticsBase = {
      totalFetched: markets.length,
      activeMarkets: activeMarkets.length,
      marketsWithVolume: activeMarkets.filter((market) => marketVolume(market) !== null).length,
      marketsWithLiquidity: activeMarkets.filter((market) => numericField(market.liquidity) !== null).length,
      relevantMarkets: relevantMarkets.length,
      probabilityFilteredMarkets: 0,
      finalMarkets: 0,
      excludedExamples: [] as Array<{ title: string; reason: string }>,
    }
    const usableMarkets: GammaMarket[] = []
    const excludedExamples: Array<{ title: string; reason: string }> = []

    for (const market of relevantMarkets) {
      const reason = exclusionReason(market, marketProbability(market))
      if (reason) {
        if (excludedExamples.length < 5) excludedExamples.push({ title: shortTitle(titleForMarket(market), market.endDate), reason })
      } else {
        usableMarkets.push(market)
      }
    }

    const seenTitles = new Set<string>()
    const marketEvents = usableMarkets
      .sort((left, right) => attentionScore(right) - attentionScore(left))
      .map((market): PredictionMarketEvent | null => {
        const probability = marketProbability(market)
        if (probability === null) return null
        const volume = marketVolume(market)
        const slug = market.slug
        const title = shortTitle(titleForMarket(market), market.endDate)
        if (seenTitles.has(title)) return null
        seenTitles.add(title)
        return {
          title,
          venue: "Polymarket" as const,
          probability,
          volume,
          liquidity: numericField(market.liquidity),
          openInterest: numericField(market.openInterest),
          lastUpdated: market.updatedAt && Number.isFinite(Date.parse(market.updatedAt))
            ? new Date(market.updatedAt).toISOString()
            : null,
          source: "polymarket-gamma" as const,
          url: slug ? `https://polymarket.com/event/${slug}` : undefined,
        }
      })
      .filter((item): item is PredictionMarketEvent => item !== null)
      .slice(0, 3)
    const diagnostics = {
      ...diagnosticsBase,
      probabilityFilteredMarkets: usableMarkets.length,
      finalMarkets: marketEvents.length,
      excludedExamples,
    }

    return {
      ok: marketEvents.length > 0,
      source: "polymarket-gamma",
      updatedAt: new Date().toISOString(),
      marketEvents,
      unavailableReason: marketEvents.length ? undefined : "NO MEANINGFUL MARKET INTEREST",
      diagnostics,
    }
  } catch (error) {
    return {
      ok: false,
      source: "polymarket-gamma",
      updatedAt: new Date().toISOString(),
      marketEvents: [],
      unavailableReason: error instanceof Error ? error.message : String(error),
      diagnostics: {
        totalFetched: 0,
        activeMarkets: 0,
        marketsWithVolume: 0,
        marketsWithLiquidity: 0,
        relevantMarkets: 0,
        probabilityFilteredMarkets: 0,
        finalMarkets: 0,
        excludedExamples: [],
      },
    }
  } finally {
    timeout.cancel()
  }
}
