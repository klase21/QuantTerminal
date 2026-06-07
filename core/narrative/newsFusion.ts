import type { NarrativeHeatItem, NewsFusionSurface, NewsNarrativeSignal, NarrativeValidationItem } from "./narrativeTypes"
import { clamp } from "@/core/shared/metrics"

export interface NewsFusionInputItem {
  title?: string
  translatedTitle?: string
  source?: string
  region?: string
  sentiment?: "bullish" | "bearish" | "neutral" | string
  importance?: number
  narratives?: string[]
  timestamp?: number
}

const SENTIMENT_SCORE: Record<string, number> = {
  bullish: 1,
  positive: 1,
  bearish: -1,
  negative: -1,
  neutral: 0,
}

function normalizeNarrative(value: string) {
  const text = value.trim()
  const aliases: Record<string, string> = {
    Meme: "MEME",
    meme: "MEME",
    Gaming: "GAMING",
    DeFi: "DEFI",
    Stablecoin: "STABLECOIN",
    Bitcoin: "BTC",
    Ethereum: "ETH",
    Solana: "SOL",
    Macro: "MACRO",
  }
  return aliases[text] ?? text.toUpperCase()
}

function sentimentValue(value: unknown) {
  const key = String(value ?? "neutral").toLowerCase()
  return SENTIMENT_SCORE[key] ?? 0
}

function buildSignals(news: NewsFusionInputItem[]): NewsNarrativeSignal[] {
  const map = new Map<string, NewsNarrativeSignal & { importanceSum: number; sentimentSum: number }>()

  for (const item of news) {
    const narratives = Array.isArray(item.narratives) ? item.narratives : []
    if (!narratives.length) continue

    for (const rawNarrative of narratives) {
      const narrative = normalizeNarrative(rawNarrative)
      const existing = map.get(narrative) ?? {
        narrative,
        buzz: 0,
        sentiment: 0,
        regions: [],
        count: 0,
        topHeadline: undefined,
        importanceSum: 0,
        sentimentSum: 0,
      }

      const importance = Number(item.importance ?? 1)
      existing.count += 1
      existing.importanceSum += Number.isFinite(importance) ? Math.max(0.5, importance) : 1
      existing.sentimentSum += sentimentValue(item.sentiment)

      const region = String(item.region ?? "global").toUpperCase()
      if (!existing.regions.includes(region)) existing.regions.push(region)

      const headline = item.translatedTitle || item.title
      if (!existing.topHeadline && headline) existing.topHeadline = headline

      map.set(narrative, existing)
    }
  }

  return [...map.values()]
    .map((item) => ({
      narrative: item.narrative,
      buzz: clamp(item.count * 12 + item.importanceSum * 7 + item.regions.length * 6),
      sentiment: item.count ? item.sentimentSum / item.count : 0,
      regions: item.regions,
      count: item.count,
      topHeadline: item.topHeadline,
    }))
    .sort((a, b) => b.buzz - a.buzz)
}

function matchHeat(signal: NewsNarrativeSignal, heatmap: NarrativeHeatItem[]) {
  const normalized = signal.narrative.toUpperCase()
  return heatmap.find((item) => item.narrative.toUpperCase() === normalized)
    ?? heatmap.find((item) => item.sectors.some((sector) => sector.toUpperCase() === normalized))
}

function buildValidation(signals: NewsNarrativeSignal[], heatmap: NarrativeHeatItem[]): NarrativeValidationItem[] {
  const seen = new Set<string>()
  const items: NarrativeValidationItem[] = []

  for (const signal of signals) {
    const heat = matchHeat(signal, heatmap)
    const liquidityHeat = heat?.heat ?? 0
    const validationScore = clamp(signal.buzz * 0.45 + liquidityHeat * 0.55)
    let status: NarrativeValidationItem["status"] = "WEAK"
    if (signal.buzz >= 45 && liquidityHeat >= 55) status = "VALIDATED"
    else if (signal.buzz >= 50 && liquidityHeat < 45) status = "NEWS_ONLY"
    else if (signal.buzz < 35 && liquidityHeat >= 65) status = "FLOW_ONLY"

    const summary = status === "VALIDATED"
      ? `${signal.narrative} news buzz is confirmed by liquidity heat.`
      : status === "NEWS_ONLY"
        ? `${signal.narrative} has headlines but liquidity confirmation is weak.`
        : status === "FLOW_ONLY"
          ? `${signal.narrative} is moving without enough headline support.`
          : `${signal.narrative} narrative remains low-conviction.`

    items.push({
      narrative: signal.narrative,
      newsBuzz: signal.buzz,
      liquidityHeat,
      validationScore,
      status,
      summary,
    })
    seen.add(signal.narrative)
  }

  for (const heat of heatmap.slice(0, 6)) {
    const narrative = heat.narrative.toUpperCase()
    if (seen.has(narrative)) continue
    if (heat.heat < 58) continue
    items.push({
      narrative,
      newsBuzz: 0,
      liquidityHeat: heat.heat,
      validationScore: clamp(heat.heat * 0.55),
      status: "FLOW_ONLY",
      summary: `${narrative} has liquidity heat without matching news buzz.`,
    })
  }

  return items.sort((a, b) => b.validationScore - a.validationScore)
}

function buildRegionalBuzz(news: NewsFusionInputItem[], signals: NewsNarrativeSignal[]) {
  const regions = ["KR", "EN", "CN"]
  return regions.map((region) => {
    const regionNews = news.filter((item) => String(item.region ?? "").toUpperCase() === region)
    const topNarratives = signals
      .filter((signal) => signal.regions.includes(region))
      .slice(0, 3)
      .map((signal) => signal.narrative)

    return {
      region,
      count: regionNews.length,
      topNarratives,
    }
  })
}

function buildDivergence(validation: NarrativeValidationItem[]) {
  const validated = validation.filter((item) => item.status === "VALIDATED")
  const newsOnly = validation.filter((item) => item.status === "NEWS_ONLY")
  const flowOnly = validation.filter((item) => item.status === "FLOW_ONLY")

  if (validated.length && !newsOnly.length && !flowOnly.length) {
    return {
      status: "VALIDATED" as const,
      summary: `News and liquidity are aligned in ${validated.slice(0, 3).map((item) => item.narrative).join("/")}.`,
      narratives: validated.slice(0, 3).map((item) => item.narrative),
    }
  }

  if (newsOnly.length && flowOnly.length) {
    return {
      status: "MIXED" as const,
      summary: `Mixed validation: headlines lead ${newsOnly[0].narrative}, while liquidity leads ${flowOnly[0].narrative}.`,
      narratives: [newsOnly[0].narrative, flowOnly[0].narrative],
    }
  }

  if (newsOnly.length) {
    return {
      status: "NEWS_WITHOUT_FLOW" as const,
      summary: `${newsOnly[0].narrative} has news buzz without enough liquidity confirmation.`,
      narratives: newsOnly.slice(0, 3).map((item) => item.narrative),
    }
  }

  if (flowOnly.length) {
    return {
      status: "FLOW_WITHOUT_NEWS" as const,
      summary: `${flowOnly[0].narrative} liquidity is moving before headlines confirm.`,
      narratives: flowOnly.slice(0, 3).map((item) => item.narrative),
    }
  }

  return {
    status: "NONE" as const,
    summary: "No strong news/liquidity divergence detected.",
    narratives: [],
  }
}

export function buildNewsFusionSurface(news: NewsFusionInputItem[], heatmap: NarrativeHeatItem[]): NewsFusionSurface {
  const signals = buildSignals(news)
  const validation = buildValidation(signals, heatmap)
  const validatedCount = validation.filter((item) => item.status === "VALIDATED").length

  return {
    ok: news.length > 0,
    totalNews: news.length,
    validatedCount,
    signals,
    validation,
    divergence: buildDivergence(validation),
    regionalBuzz: buildRegionalBuzz(news, signals),
  }
}
