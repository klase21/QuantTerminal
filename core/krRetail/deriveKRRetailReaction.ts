import { clamp } from "@/core/shared/metrics"
import type {
  CoinnessBreakingNewsItem,
  KRRetailMood,
  KRRetailReactionSurface,
  KRRetailSignal,
  SaveTickerNewsItem,
} from "./krRetailTypes"

const NARRATIVE_KEYWORDS: Record<string, string[]> = {
  BTC: ["BTC", "비트코인", "bitcoin"],
  ETH: ["ETH", "이더리움", "ethereum"],
  ETF: ["ETF", "현물 ETF"],
  Regulation: ["SEC", "상원", "법안", "규제", "클래리티", "CLARITY", "CFTC"],
  Stablecoin: ["스테이블코인", "stablecoin"],
  Exchange: ["바이낸스", "거래소", "coinbase", "upbit", "업비트"],
  Institutional: ["모건스탠리", "BNY", "블룸버그", "로이터", "기관", "ETF"],
  Risk: ["해킹", "이란", "제재", "소송", "유출", "만기"],
}

function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}

function safeDate(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : new Date().toISOString()
}

function inferNarrativesFromText(title?: string, content?: string, tags?: string[]) {
  const text = `${title ?? ""} ${content ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase()
  const matches = Object.entries(NARRATIVE_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .map(([label]) => label)
  return matches.length ? matches.slice(0, 4) : ["Crypto"]
}

function moodFor(positiveRatio: number, conviction: number, attention: number): KRRetailMood {
  if (attention < 16 && conviction < 16) return "Quiet"
  if (positiveRatio >= 72 && conviction >= 58) return "Euphoric"
  if (positiveRatio >= 58) return "Constructive"
  if (positiveRatio <= 38 && conviction >= 42) return "Defensive"
  return "Divided"
}

function labelFor(mood: KRRetailMood) {
  switch (mood) {
    case "Euphoric":
      return "KR Retail Euphoric"
    case "Constructive":
      return "KR Retail Constructive"
    case "Defensive":
      return "KR Retail Defensive"
    case "Divided":
      return "KR Retail Divided"
    default:
      return "KR Retail Quiet"
  }
}

function normalizeSaveTickerItem(item: SaveTickerNewsItem): KRRetailSignal {
  const positive = safeNumber(item.vote_stats?.vote_counts?.positive)
  const negative = safeNumber(item.vote_stats?.vote_counts?.negative)
  const votes = safeNumber(item.vote_stats?.total_count) || positive + negative
  const views = safeNumber(item.view_count)
  const positiveRatio = votes > 0 ? clamp((positive / votes) * 100) : 50
  const voteDensity = views > 0 ? clamp((votes / Math.max(views, 1)) * 1800) : clamp(votes * 0.9)
  const attention = clamp(Math.log10(views + 1) * 22 + (item.is_top_story ? 12 : 0) + Math.min(12, safeNumber(item.similar_count) * 2))
  const polarityDistance = Math.abs(positiveRatio - 50) * 2
  const conviction = clamp(polarityDistance * 0.52 + voteDensity * 0.26 + attention * 0.22)
  const mood = moodFor(positiveRatio, conviction, attention)

  return {
    id: `saveticker-${String(item.id)}`,
    title: item.title ?? "Untitled KR story",
    source: item.source ?? "SaveTicker",
    sourceType: "SaveTicker",
    createdAt: item.created_at,
    views,
    votes,
    positive,
    negative,
    positiveRatio,
    conviction,
    attention,
    mood,
    narratives: inferNarrativesFromText(item.title, item.content, item.tag_names),
    isTopStory: Boolean(item.is_top_story),
  }
}

function normalizeCoinnessItem(item: CoinnessBreakingNewsItem): KRRetailSignal {
  const positive = safeNumber(item.bullCount ?? item.bull)
  const negative = safeNumber(item.bearCount ?? item.bear)
  const votes = positive + negative
  const views = safeNumber(item.viewCount ?? item.view_count)
  const positiveRatio = votes > 0 ? clamp((positive / votes) * 100) : 50
  const attention = clamp(Math.log10(votes + 1) * 26 + Math.log10(views + 1) * 10)
  const polarityDistance = Math.abs(positiveRatio - 50) * 2
  const conviction = clamp(polarityDistance * 0.62 + Math.log10(votes + 1) * 24 + attention * 0.14)
  const mood = moodFor(positiveRatio, conviction, attention)
  const id = item.id ?? item.newsId ?? `${item.title ?? "coinness"}-${item.createdAt ?? item.created_at ?? ""}`
  const tags = item.tags ?? item.tagNames ?? (item.category ? [item.category] : [])

  return {
    id: `coinness-${String(id)}`,
    title: item.title ?? "Untitled Coinness alert",
    source: item.source ?? "Coinness",
    sourceType: "Coinness",
    createdAt: safeDate(item.createdAt ?? item.created_at ?? item.publishedAt),
    views,
    votes,
    positive,
    negative,
    positiveRatio,
    conviction,
    attention,
    mood,
    narratives: inferNarrativesFromText(item.title, item.content, tags),
    isTopStory: votes >= 30 || polarityDistance >= 70,
  }
}

function summaryFor(surface: Pick<KRRetailReactionSurface, "mood" | "positiveRatio" | "participationScore" | "convictionScore" | "coinnessReactionScore" | "saveTickerConvictionScore">) {
  const ratio = surface.positiveRatio.toFixed(0)
  if (surface.mood === "Euphoric") return `Korean retail reaction is strongly positive (${ratio}% positive). Coinness is the fast reaction layer; SaveTicker confirms conviction density.`
  if (surface.mood === "Constructive") return `Korean retail tone is constructive (${ratio}% positive). Reaction is supportive but not yet euphoric.`
  if (surface.mood === "Defensive") return `Korean retail tone is defensive (${ratio}% positive). Bearish reactions are carrying conviction.`
  if (surface.mood === "Divided") return `Korean retail reaction is divided (${ratio}% positive). This is attention without clear consensus.`
  return "Korean retail reaction is quiet or insufficiently sampled."
}

export function deriveKRRetailReaction(
  saveTickerItems: SaveTickerNewsItem[] = [],
  coinnessItems: CoinnessBreakingNewsItem[] = []
): KRRetailReactionSurface {
  const saveTickerSignals = saveTickerItems.map(normalizeSaveTickerItem)
  const coinnessSignals = coinnessItems.map(normalizeCoinnessItem)
  const signals = [...saveTickerSignals, ...coinnessSignals].sort((a, b) => (b.conviction + b.attention * 0.35) - (a.conviction + a.attention * 0.35))

  const totalViews = signals.reduce((sum, item) => sum + item.views, 0)
  const totalVotes = signals.reduce((sum, item) => sum + item.votes, 0)
  const positiveVotes = signals.reduce((sum, item) => sum + item.positive, 0)
  const positiveRatio = totalVotes > 0 ? clamp((positiveVotes / totalVotes) * 100) : 50
  const attentionScore = clamp(Math.log10(totalViews + totalVotes + 1) * 22)
  const convictionScore = signals.length ? clamp(signals.slice(0, 10).reduce((sum, item) => sum + item.conviction, 0) / Math.min(10, signals.length)) : 0
  const participationScore = clamp(attentionScore * 0.34 + convictionScore * 0.34 + Math.log10(totalVotes + 1) * 22)
  const coinnessReactionScore = coinnessSignals.length ? clamp(coinnessSignals.slice(0, 8).reduce((sum, item) => sum + item.conviction, 0) / Math.min(8, coinnessSignals.length)) : 0
  const saveTickerConvictionScore = saveTickerSignals.length ? clamp(saveTickerSignals.slice(0, 8).reduce((sum, item) => sum + item.conviction, 0) / Math.min(8, saveTickerSignals.length)) : 0
  const mood = moodFor(positiveRatio, convictionScore, participationScore)
  const partial: Pick<KRRetailReactionSurface, "mood" | "positiveRatio" | "participationScore" | "convictionScore" | "coinnessReactionScore" | "saveTickerConvictionScore"> = {
    mood,
    positiveRatio,
    participationScore,
    convictionScore,
    coinnessReactionScore,
    saveTickerConvictionScore,
  }

  const source = saveTickerSignals.length && coinnessSignals.length
    ? "combined"
    : saveTickerSignals.length
      ? "saveticker"
      : coinnessSignals.length
        ? "coinness"
        : "fallback"

  return {
    ok: signals.length > 0,
    generatedAt: new Date().toISOString(),
    totalStories: signals.length,
    totalViews,
    totalVotes,
    positiveRatio,
    attentionScore,
    convictionScore,
    participationScore,
    coinnessReactionScore,
    saveTickerConvictionScore,
    mood,
    label: labelFor(mood),
    summary: summaryFor(partial),
    topSignals: signals.slice(0, 8),
    source,
    sourceBreakdown: {
      saveticker: saveTickerSignals.length,
      coinness: coinnessSignals.length,
    },
    notes: signals.length ? [] : ["No Coinness or SaveTicker items were available for KR retail reaction analysis."],
  }
}
