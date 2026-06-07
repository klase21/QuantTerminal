import { NextResponse } from "next/server"
import type { UpbitDataLabSnapshot } from "@/lib/regime/calculateMarketRegime"

const DATALAB_OVERVIEW_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/overview"

const DATALAB_FEAR_GREED_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/fear/candles/days?count=1825"

const DATALAB_VOLATILITY_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/volatility/index/candles/days?code=IDX.UPBIT.UPBIT_COMP&count=1825"

const DATALAB_ALTSEASON_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/altseason/candles/days?count=1826"

const DATALAB_BTC_DOMINANCE_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/mdom/candles/days?count=1825"

const DATALAB_TRADE_VOLUME_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/katp/candles/days?count=1825"

const DATALAB_PREMIUM_DAYS_URL =
  "https://datalab-api.upbit.com/api/v1/indicator/premium/candles/days?count=1825"

const DATALAB_MARKET_INDEX_URL =
  "https://datalab-api.upbit.com/api/v1/index/category/main?categoryType=market"

const UPBIT_PUBLIC_API = "https://api.upbit.com/v1"

type MetricSource =
  | "upbit-datalab-overview"
  | "upbit-datalab-fear-history"
  | "upbit-datalab-volatility-index"
  | "upbit-datalab-market-index"
  | "upbit-datalab-history"
  | "upbit-public-proxy"

type MetricKey = keyof Pick<
  UpbitDataLabSnapshot,
  "fearGreed" | "altSeason" | "btcDominance" | "premium" | "tradeVolumeTrend" | "volatility"
>

type MetricResult = {
  key: MetricKey
  value: number
  source: MetricSource
  note?: string
}

type DataLabIndicator = {
  info?: {
    category?: string
    name?: string
  }
  price?: {
    prevClosingPrice?: number | string
    tradePrice?: number | string
    signedChangeRate?: number | string
    signedChangePrice?: number | string
    candleDateTimeKst?: string
    candleDateTime?: string
  }
  chart?: {
    gauge?: {
      tradePrice?: number | string
      stage?: string
      name?: string
    }
    bar?: {
      isRatio?: boolean
      bars?: Array<{
        name?: string
        code?: string
        tradePrice?: number | string
      }>
    }
    candle?: {
      candles?: Array<{
        date?: string
        candleDateTime?: string
        tradePrice?: number | string
      }>
    }
  }
}

type OverviewPayload = {
  code?: number
  message?: string
  data?: {
    indicators?: DataLabIndicator[]
    locale?: string
  }
}

type UpbitTicker = {
  market: string
  trade_price: number
  signed_change_rate: number
  acc_trade_price_24h: number
  high_price: number
  low_price: number
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function pctFromRatio(value: number | null) {
  if (value === null) return null
  // Overview dominance bars are ratios such as 0.6464. Convert to 64.64%.
  return Math.abs(value) <= 1 ? value * 100 : value
}

async function fetchWithTimeout(url: string, timeoutMs = 8_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        origin: "https://datalab.upbit.com",
        referer: "https://datalab.upbit.com/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 QuantTerminal/1.0",
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

function getIndicator(payload: OverviewPayload, category: string) {
  return payload.data?.indicators?.find(
    (indicator) => indicator.info?.category?.toLowerCase() === category.toLowerCase()
  )
}

function indicatorPrice(indicator?: DataLabIndicator) {
  return toNumber(indicator?.price?.tradePrice)
}

function indicatorSignedChangeRatePct(indicator?: DataLabIndicator) {
  const ratio = toNumber(indicator?.price?.signedChangeRate)
  if (ratio === null) return null
  return ratio * 100
}

function extractBtcDominance(indicator?: DataLabIndicator) {
  const btcBar = indicator?.chart?.bar?.bars?.find((bar) => {
    const name = bar.name ?? ""
    const code = bar.code ?? ""
    return name.includes("비트코인") || code.includes("KRW-BTC") || code.includes("BTC")
  })

  return pctFromRatio(toNumber(btcBar?.tradePrice))
}

async function fetchOverviewMetrics(): Promise<{
  results: MetricResult[]
  rawCategories: string[]
  updatedAt?: string
}> {
  const response = await fetchWithTimeout(DATALAB_OVERVIEW_URL)

  if (!response.ok) {
    throw new Error(`Upbit DataLab overview API returned ${response.status}`)
  }

  const json = (await response.json()) as OverviewPayload
  const indicators = json.data?.indicators ?? []

  if (!indicators.length) {
    throw new Error("Upbit DataLab overview API returned no indicators")
  }

  const results: MetricResult[] = []
  const add = (key: MetricKey, value: number | null, source: MetricSource, note?: string) => {
    if (value === null || !Number.isFinite(value)) return
    results.push({ key, value, source, note })
  }

  const fear = getIndicator(json, "fear")
  const altseason = getIndicator(json, "altseason")
  const premium = getIndicator(json, "premium")
  const dominance = getIndicator(json, "mdom")
  const volume = getIndicator(json, "katp")

  add("fearGreed", indicatorPrice(fear), "upbit-datalab-overview")
  add("altSeason", indicatorPrice(altseason), "upbit-datalab-overview")
  add("premium", indicatorPrice(premium), "upbit-datalab-overview")
  add("btcDominance", extractBtcDominance(dominance), "upbit-datalab-overview")
  add("tradeVolumeTrend", indicatorSignedChangeRatePct(volume), "upbit-datalab-overview")

  return {
    results,
    rawCategories: indicators
      .map((indicator) => indicator.info?.category)
      .filter((category): category is string => Boolean(category)),
    updatedAt: fear?.price?.candleDateTimeKst ?? volume?.price?.candleDateTimeKst,
  }
}


type HistoryPoint = {
  date?: string
  value: number
}

type HistoryMetric = {
  key: string
  label: string
  current: number | null
  change7d: number | null
  change30d: number | null
  acceleration: number | null
  percentile: number | null
  direction: "UP" | "DOWN" | "FLAT" | "UNKNOWN"
  coverage: string
  points: HistoryPoint[]
}

function pctRank(current: number, values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value))
  if (!finite.length) return null
  const belowOrEqual = finite.filter((value) => value <= current).length
  return (belowOrEqual / finite.length) * 100
}

function findDate(value: Record<string, unknown>) {
  const date =
    value.candleDateTimeKst ??
    value.candleDateTime ??
    value.candle_date_time_kst ??
    value.candle_date_time_utc ??
    value.date ??
    value.time ??
    value.timestamp

  return typeof date === "string" ? date : undefined
}

function extractHistoryPoints(payload: unknown, aliases: string[] = ["tradePrice", "index", "score", "value", "close", "closingPrice"]): HistoryPoint[] {
  const rows: HistoryPoint[] = []

  const scanArray = (items: unknown[]) => {
    for (const item of items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue
      const record = item as Record<string, unknown>
      let parsed: number | null = null

      for (const alias of aliases) {
        const exactKey = Object.keys(record).find((key) => key.toLowerCase() === alias.toLowerCase())
        if (exactKey) {
          parsed = toNumber(record[exactKey])
          if (parsed !== null) break
        }
      }

      if (parsed !== null && Number.isFinite(parsed)) {
        rows.push({
          date: findDate(record),
          value: parsed,
        })
      }
    }
  }

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      scanArray(value)
      value.forEach(walk)
      return
    }

    if (!value || typeof value !== "object") return
    Object.values(value).forEach(walk)
  }

  walk(payload)

  const deduped: HistoryPoint[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const key = `${row.date ?? ""}:${row.value}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
  }

  return deduped
}

function normalizeHistoryValue(key: string, value: number) {
  if (key === "volatility" && Math.abs(value) <= 1) return value * 100
  if (key === "btcDominance" && Math.abs(value) <= 1) return value * 100
  if (key === "premium" && Math.abs(value) <= 1) return value * 100
  return value
}

function summarizeHistory(key: string, label: string, points: HistoryPoint[], coverage: string): HistoryMetric {
  const normalized = points
    .map((point) => ({ ...point, value: normalizeHistoryValue(key, point.value) }))
    .filter((point) => Number.isFinite(point.value))

  const current = normalized[0]?.value ?? null
  const day7 = normalized[7]?.value ?? null
  const day14 = normalized[14]?.value ?? null
  const day30 = normalized[30]?.value ?? null

  const change7d = current !== null && day7 !== null ? current - day7 : null
  const change30d = current !== null && day30 !== null ? current - day30 : null
  const previous7dChange = day7 !== null && day14 !== null ? day7 - day14 : null
  const acceleration = change7d !== null && previous7dChange !== null ? change7d - previous7dChange : null
  const percentile = current !== null ? pctRank(current, normalized.map((point) => point.value)) : null

  let direction: HistoryMetric["direction"] = "UNKNOWN"
  if (change7d !== null) {
    direction = Math.abs(change7d) < 0.01 ? "FLAT" : change7d > 0 ? "UP" : "DOWN"
  }

  return {
    key,
    label,
    current,
    change7d,
    change30d,
    acceleration,
    percentile,
    direction,
    coverage,
    points: normalized.slice(0, 90),
  }
}

async function fetchHistoryMetric(key: string, label: string, url: string, coverage: string): Promise<HistoryMetric> {
  const response = await fetchWithTimeout(url, 10_000)
  if (!response.ok) {
    throw new Error(`Upbit DataLab ${label} history API returned ${response.status}`)
  }

  const json = await response.json()
  const points = extractHistoryPoints(json, [
    "tradePrice",
    "index",
    "score",
    "value",
    "close",
    "closingPrice",
    "accTradePrice",
    "acc_trade_price",
  ])

  if (!points.length) {
    throw new Error(`Upbit DataLab ${label} history API returned no parsable candles`)
  }

  return summarizeHistory(key, label, points, coverage)
}

async function fetchHistoricalMetrics(notes: string[]) {
  const specs = [
    ["fearGreed", "Fear / Greed", DATALAB_FEAR_GREED_DAYS_URL, "5Y"],
    ["volatility", "Volatility", DATALAB_VOLATILITY_DAYS_URL, "5Y"],
    ["altSeason", "Altseason", DATALAB_ALTSEASON_DAYS_URL, "5Y"],
    ["btcDominance", "BTC Dominance", DATALAB_BTC_DOMINANCE_DAYS_URL, "5Y"],
    ["tradeVolumeTrend", "Upbit Trade Volume", DATALAB_TRADE_VOLUME_DAYS_URL, "5Y"],
    ["premium", "Upbit Premium", DATALAB_PREMIUM_DAYS_URL, "Since 2024"],
  ] as const

  const entries = await Promise.all(
    specs.map(async ([key, label, url, coverage]) => {
      try {
        const metric = await fetchHistoryMetric(key, label, url, coverage)
        return [key, metric] as const
      } catch (error) {
        notes.push(error instanceof Error ? error.message : `${label} history API failed`)
        return null
      }
    })
  )

  return Object.fromEntries(entries.filter(Boolean) as Array<readonly [string, HistoryMetric]>)
}

async function fetchFearGreedHistoryMetric(): Promise<MetricResult | null> {
  const response = await fetchWithTimeout(DATALAB_FEAR_GREED_DAYS_URL)

  if (!response.ok) {
    throw new Error(`Upbit DataLab fear/greed history API returned ${response.status}`)
  }

  const json = await response.json()
  const candidates: number[] = []

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    if (!value || typeof value !== "object") return

    for (const [key, child] of Object.entries(value)) {
      if (/tradePrice|index|score|value|close/i.test(key)) {
        const parsed = toNumber(child)
        if (parsed !== null && parsed >= 0 && parsed <= 100) candidates.push(parsed)
      }
      walk(child)
    }
  }

  walk(json)

  if (!candidates.length) return null

  return {
    key: "fearGreed",
    value: candidates[0],
    source: "upbit-datalab-fear-history",
  }
}

function extractLatestCandleValue(json: unknown, aliases: string[] = ["tradePrice", "index", "score", "value", "close"]): number | null {
  const candidates: Array<{ value: number; depth: number }> = []

  const walk = (value: unknown, depth = 0) => {
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, depth + 1))
      return
    }

    if (!value || typeof value !== "object") return

    for (const [key, child] of Object.entries(value)) {
      if (aliases.some((alias) => alias.toLowerCase() === key.toLowerCase())) {
        const parsed = toNumber(child)
        if (parsed !== null && parsed >= 0) candidates.push({ value: parsed, depth })
      }
      walk(child, depth + 1)
    }
  }

  walk(json)

  if (!candidates.length) return null
  // Most DataLab candle payloads are returned newest-first. Prefer the first shallow numeric candle value.
  return candidates.sort((a, b) => a.depth - b.depth)[0].value
}

async function fetchVolatilityIndexMetric(): Promise<MetricResult | null> {
  const response = await fetchWithTimeout(DATALAB_VOLATILITY_DAYS_URL)

  if (!response.ok) {
    throw new Error(`Upbit DataLab volatility index API returned ${response.status}`)
  }

  const json = await response.json()
  const rawValue = extractLatestCandleValue(json, [
    "volatility",
    "tradePrice",
    "index",
    "score",
    "value",
    "close",
    "closingPrice",
  ])

  if (rawValue === null) return null

  // DataLab volatility index candles can return decimal values, e.g. 0.162019.
  // Keep full floating-point precision after percentage-scale normalization.
  // UI formatting should be handled only in the presentation layer.
  const normalizedValue = Math.abs(rawValue) <= 1 ? rawValue * 100 : rawValue

  return {
    key: "volatility",
    value: normalizedValue,
    source: "upbit-datalab-volatility-index",
    note: "Volatility uses DataLab volatility index IDX.UPBIT.UPBIT_COMP and keeps raw precision after percentage-scale normalization.",
  }
}

async function fetchMarketIndexMetrics(): Promise<MetricResult[]> {
  const response = await fetchWithTimeout(DATALAB_MARKET_INDEX_URL)

  if (!response.ok) {
    throw new Error(`Upbit DataLab market index API returned ${response.status}`)
  }

  const json = await response.json()
  const text = JSON.stringify(json)
  const results: MetricResult[] = []

  const findAround = (aliases: string[], min: number, max: number) => {
    const lower = text.toLowerCase()
    const index = aliases
      .map((alias) => lower.indexOf(alias.toLowerCase()))
      .filter((idx) => idx >= 0)
      .sort((a, b) => a - b)[0]

    if (index === undefined) return null
    const slice = text.slice(index, index + 1500)
    const matches = slice.match(/[+-]?\d+(?:\.\d+)?/g) ?? []
    const found = matches.map(Number).find((value) => value >= min && value <= max)
    return typeof found === "number" ? found : null
  }

  const alt = findAround(["altseason", "알트"], 0, 100)
  if (alt !== null) results.push({ key: "altSeason", value: alt, source: "upbit-datalab-market-index" })

  return results
}

async function fetchUpbitTickerProxy(): Promise<MetricResult[]> {
  const markets = [
    "KRW-BTC",
    "KRW-ETH",
    "KRW-XRP",
    "KRW-SOL",
    "KRW-DOGE",
    "KRW-ADA",
    "KRW-AVAX",
    "KRW-LINK",
    "KRW-SUI",
    "KRW-ONDO",
  ]

  const response = await fetchWithTimeout(
    `${UPBIT_PUBLIC_API}/ticker?markets=${markets.join(",")}`,
    8_000
  )

  if (!response.ok) {
    throw new Error(`Upbit public ticker returned ${response.status}`)
  }

  const tickers = (await response.json()) as UpbitTicker[]
  const valid = tickers.filter((ticker) => Number.isFinite(ticker.signed_change_rate))

  if (!valid.length) {
    throw new Error("Upbit public ticker returned no usable market data")
  }

  const btc = valid.find((ticker) => ticker.market === "KRW-BTC")
  const altTickers = valid.filter((ticker) => ticker.market !== "KRW-BTC")
  const positiveAltRatio = altTickers.length
    ? altTickers.filter((ticker) => ticker.signed_change_rate > 0).length / altTickers.length
    : 0.5
  const avgChange =
    valid.reduce((sum, ticker) => sum + ticker.signed_change_rate * 100, 0) / valid.length
  const totalVolume = valid.reduce((sum, ticker) => sum + ticker.acc_trade_price_24h, 0)
  const btcVolumeShare = btc && totalVolume ? (btc.acc_trade_price_24h / totalVolume) * 100 : 35
  const avgIntradayRange =
    valid.reduce((sum, ticker) => {
      const range = ticker.trade_price
        ? ((ticker.high_price - ticker.low_price) / ticker.trade_price) * 100
        : 0
      return sum + range
    }, 0) / valid.length

  return [
    {
      key: "fearGreed",
      value: clamp(50 + avgChange * 3),
      source: "upbit-public-proxy",
      note: "Proxy from Upbit public ticker change rate, not DataLab overview.",
    },
    {
      key: "altSeason",
      value: positiveAltRatio * 100,
      source: "upbit-public-proxy",
      note: "Proxy from sampled KRW alt positive breadth.",
    },
    {
      key: "btcDominance",
      value: clamp(btcVolumeShare),
      source: "upbit-public-proxy",
      note: "Proxy from sampled KRW BTC volume share.",
    },
    {
      key: "tradeVolumeTrend",
      value: Math.max(-100, Math.min(300, totalVolume / 100_000_000_000)),
      source: "upbit-public-proxy",
      note: "Proxy from sampled KRW 24h trading value scale.",
    },
    {
      key: "volatility",
      value: clamp(avgIntradayRange * 10),
      source: "upbit-public-proxy",
      note: "Proxy from sampled intraday high-low range.",
    },
  ]
}

export async function GET() {
  const notes: string[] = []
  const resultSources: Record<string, string> = {}
  const snapshot: UpbitDataLabSnapshot = {
    ok: false,
    source: "upbit-datalab-overview",
    updatedAt: new Date().toISOString(),
    notes,
  }

  const applyResult = (result: MetricResult, overwrite = true) => {
    if (!overwrite && resultSources[result.key]) return
    ;(snapshot as Record<string, unknown>)[result.key] = result.value
    resultSources[result.key] = result.source
    if (result.note) notes.push(result.note)
  }

  let rawCategories: string[] = []

  try {
    const history = await fetchHistoricalMetrics(notes)
    snapshot.history = history
    Object.entries(history).forEach(([key, metric]) => {
      if (metric.current !== null && !resultSources[key]) {
        ;(snapshot as Record<string, unknown>)[key] = metric.current
        resultSources[key] = "upbit-datalab-history"
      }
    })
  } catch (error) {
    notes.push(error instanceof Error ? error.message : "Upbit DataLab history APIs failed")
  }

  try {
    const overview = await fetchOverviewMetrics()
    rawCategories = overview.rawCategories
    overview.results.forEach((result) => applyResult(result))
    if (overview.updatedAt) snapshot.updatedAt = overview.updatedAt
  } catch (error) {
    notes.push(error instanceof Error ? error.message : "Upbit DataLab overview API failed")
  }

  if (!resultSources.fearGreed) {
    try {
      const fearHistory = await fetchFearGreedHistoryMetric()
      if (fearHistory) applyResult(fearHistory)
    } catch (error) {
      notes.push(error instanceof Error ? error.message : "Upbit DataLab fear/greed history API failed")
    }
  }

  if (!resultSources.volatility) {
    try {
      const volatilityIndex = await fetchVolatilityIndexMetric()
      if (volatilityIndex) applyResult(volatilityIndex)
    } catch (error) {
      notes.push(error instanceof Error ? error.message : "Upbit DataLab volatility index API failed")
    }
  }

  if (!resultSources.altSeason) {
    try {
      const marketIndexResults = await fetchMarketIndexMetrics()
      marketIndexResults.forEach((result) => applyResult(result, false))
    } catch (error) {
      notes.push(error instanceof Error ? error.message : "Upbit DataLab market index API failed")
    }
  }

  const parsedKeys = new Set(Object.keys(resultSources))
  if (parsedKeys.size > 0) {
    snapshot.ok = true
    snapshot.source = Object.values(resultSources).some((source) => source.startsWith("upbit-datalab"))
      ? "upbit-datalab-overview"
      : "upbit-public-proxy"
  }

  const expected: Array<[MetricKey, string]> = [
    ["fearGreed", "Fear / Greed"],
    ["altSeason", "Altseason"],
    ["btcDominance", "BTC Dominance"],
    ["premium", "Upbit Premium"],
    ["tradeVolumeTrend", "Trade Volume Trend"],
    ["volatility", "Volatility"],
  ]

  expected.forEach(([key, label]) => {
    if (!parsedKeys.has(key)) notes.push(`${label} not parsed from current DataLab payload yet.`)
  })

  if (!snapshot.ok) {
    try {
      const proxyResults = await fetchUpbitTickerProxy()
      proxyResults.forEach((result) => applyResult(result))
      snapshot.ok = true
      snapshot.source = "upbit-public-proxy"
      notes.unshift(
        "DataLab APIs failed or changed shape, so this snapshot is using Upbit public ticker proxy values."
      )
    } catch (error) {
      notes.push(error instanceof Error ? error.message : "Upbit public ticker proxy failed")
    }
  }

  return NextResponse.json(
    {
      ...snapshot,
      endpoints: {
        overview: DATALAB_OVERVIEW_URL,
        fearGreedHistory: DATALAB_FEAR_GREED_DAYS_URL,
        volatilityIndex: DATALAB_VOLATILITY_DAYS_URL,
        altseasonHistory: DATALAB_ALTSEASON_DAYS_URL,
        btcDominanceHistory: DATALAB_BTC_DOMINANCE_DAYS_URL,
        tradeVolumeHistory: DATALAB_TRADE_VOLUME_DAYS_URL,
        premiumHistory: DATALAB_PREMIUM_DAYS_URL,
        marketIndex: DATALAB_MARKET_INDEX_URL,
      },
      resultSources,
      rawCategories,
      mode: snapshot.source === "upbit-public-proxy" ? "proxy" : "datalab-overview",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
