import { adaptMockReplayCase } from "@/core/replay/replayAdapter"
import { MOCK_REPLAY_SOURCE_CASES } from "@/core/replay/mockReplayData"
import type { ReplayCase } from "@/core/replay/replayTypes"
import type {
  HistoricalEvent,
  HistoricalEventCategory,
  HistoricalEventRepository,
  OutcomeStatistics,
  ReplayCaseEventLink,
  ReplayCaseRepository,
  ReplayCaseStorageRecord,
  ReplayFrameStorageRecord,
  SetupOutcomeRecord,
  SetupOutcomeRepository,
  SimilarEventMatch,
  SimilarEventMatchReason,
  SimilarEventQuery,
} from "./historicalIntelligenceTypes"
import { mapStorageReplayCaseToReplayCase } from "./historicalIntelligenceTypes"

export type HistoricalReplayEventType = NonNullable<ReplayCaseStorageRecord["eventType"]>

export interface ReplayCaseCatalogEntry {
  id: string
  eventType: HistoricalReplayEventType
  shockLevel: NonNullable<ReplayCaseStorageRecord["shockLevel"]>
  replay: ReplayCase
}

const GENERATED_AT = "2026-06-07T00:00:00.000Z"

const MOCK_REPLAY_CASES = MOCK_REPLAY_SOURCE_CASES.map(adaptMockReplayCase)

const STORAGE_CASES: ReplayCaseStorageRecord[] = MOCK_REPLAY_SOURCE_CASES.map((source) => ({
  id: source.id,
  title: source.title,
  symbol: source.symbol,
  window: source.window,
  setup: source.setup,
  outcome: source.outcome,
  verdict: source.verdict,
  verdictSummary: source.verdictSummary,
  realityCheck: source.realityCheck,
  eventType: source.eventType,
  shockLevel: source.shockLevel,
  eventWindow: {
    start: source.pricePath[0]?.label ?? "T-00",
    peak: source.pricePath[Math.floor(source.pricePath.length / 2)]?.label,
    end: source.pricePath[source.pricePath.length - 1]?.label ?? "T+00",
  },
  tags: [source.symbol, source.eventType, source.shockLevel, source.primaryNarrative],
  sources: [
    {
      id: `${source.id}-source-case`,
      source: "mock-replay-catalog",
      category: "manual_case_note",
      title: source.title,
      capturedAt: GENERATED_AT,
      confidence: 100,
    },
  ],
  createdAt: GENERATED_AT,
  updatedAt: GENERATED_AT,
}))

const STORAGE_FRAMES: ReplayFrameStorageRecord[] = MOCK_REPLAY_CASES.flatMap((replay) =>
  replay.frames.map((frame) => ({
    ...frame,
    caseId: replay.id,
    sourceIds: [`${replay.id}-source-case`],
  })),
)

function eventCategoryFromTitle(title: string): HistoricalEventCategory {
  const normalized = title.toLowerCase()
  if (normalized.includes("funding")) return "funding"
  if (normalized.includes("oi") || normalized.includes("open interest")) return "open_interest"
  if (normalized.includes("liquidation") || normalized.includes("squeeze")) return "liquidation"
  if (normalized.includes("etf") || normalized.includes("policy")) return "narrative"
  if (normalized.includes("fed") || normalized.includes("fomc") || normalized.includes("macro")) return "macro"
  if (normalized.includes("probability") || normalized.includes("odds") || normalized.includes("expectation")) {
    return "prediction_market"
  }
  if (normalized.includes("break") || normalized.includes("support") || normalized.includes("resistance")) return "price"
  return "news"
}

const HISTORICAL_EVENTS: HistoricalEvent[] = MOCK_REPLAY_SOURCE_CASES.flatMap((source) => {
  const timelineEvents: HistoricalEvent[] = source.events.map((event) => ({
    id: event.id,
    timestamp: event.time,
    category: eventCategoryFromTitle(event.title),
    symbol: source.symbol,
    venue: "manual",
    source: "mock-replay-catalog",
    title: event.title,
    summary: event.description,
    severity: event.severity,
    confidence: 76,
    data: {
      eventType: source.eventType,
      shockLevel: source.shockLevel,
      replayCaseId: source.id,
    },
    tags: [source.symbol, source.eventType, source.primaryNarrative],
    relatedCaseIds: [source.id],
    ingestedAt: GENERATED_AT,
    impact: {
      direction: source.verdict === "Narrative Failed" ? "mixed" : source.verdict === "Narrative Confirmed" ? "neutral" : "mixed",
      affectedAssets: [source.symbol],
      expectedImpactWindow: "hours",
      tacticalRead: source.verdictSummary,
    },
    narrative: {
      claim: source.primaryNarrative,
      support: source.news.map((item) => item.headline),
      contradiction: [source.realityCheck],
      conclusion: source.verdictSummary,
      narrativeTags: [source.primaryNarrative, source.eventType],
    },
  }))

  const newsEvents: HistoricalEvent[] = source.news.map((item, index) => ({
    id: `${source.id}-news-${index + 1}`,
    timestamp: item.time,
    category: "news",
    symbol: source.symbol,
    venue: "manual",
    source: item.source,
    title: item.headline,
    summary: item.narrative,
    severity: item.sentiment === "negative" ? "MEDIUM" : "LOW",
    confidence: 68,
    data: {
      sentiment: item.sentiment,
      narrative: item.narrative,
      replayCaseId: source.id,
    },
    tags: [source.symbol, source.eventType, item.narrative],
    relatedCaseIds: [source.id],
    ingestedAt: GENERATED_AT,
    narrative: {
      claim: item.narrative,
      support: [item.headline],
      conclusion: source.realityCheck,
      narrativeTags: [item.narrative, source.primaryNarrative],
    },
  }))

  return [...timelineEvents, ...newsEvents]
})

const EVENT_LINKS: ReplayCaseEventLink[] = HISTORICAL_EVENTS.flatMap((event) =>
  (event.relatedCaseIds ?? []).map((caseId) => ({
    caseId,
    eventId: event.id,
    role: event.category === "price" ? "market_reaction" : event.category === "news" ? "supporting_evidence" : "context",
    weight: event.severity === "HIGH" ? 90 : event.severity === "MEDIUM" ? 70 : 45,
    note: event.summary,
  })),
)

const SETUP_OUTCOMES: SetupOutcomeRecord[] = MOCK_REPLAY_SOURCE_CASES.map((source) => {
  const confirmed = source.verdict === "Narrative Confirmed"

  return {
    id: `${source.id}-setup-outcome`,
    caseId: source.id,
    symbol: source.symbol,
    timestamp: source.events[source.events.length - 1]?.time ?? GENERATED_AT,
    setupName: source.title,
    thesis: source.setup,
    conditions: [
      {
        id: `${source.id}-technical-condition`,
        label: "Technical confirmation",
        category: "technical",
        expectedState: "Structure confirms event read",
        observedState: source.outcome,
        matched: confirmed,
        weight: 25,
      },
      {
        id: `${source.id}-flow-condition`,
        label: "Flow confirmation",
        category: "flow",
        expectedState: "Funding/OI supports the setup",
        observedState: source.derivatives.crowdingRead,
        matched: confirmed || source.eventType === "liquidity",
        weight: 30,
      },
      {
        id: `${source.id}-narrative-condition`,
        label: "Narrative confirmation",
        category: "narrative",
        expectedState: source.primaryNarrative,
        observedState: source.realityCheck,
        matched: confirmed,
        weight: 25,
      },
      {
        id: `${source.id}-risk-condition`,
        label: "Risk control",
        category: "risk",
        expectedState: "Avoid late low-quality chase",
        observedState: source.risk.summary,
        matched: true,
        weight: 20,
      },
    ],
    tradeOutcome: confirmed ? "win" : "avoided",
    realizedReturnPct: confirmed ? 2.4 : 0.3,
    holdMinutes: Number.parseInt(source.window, 10) || undefined,
    mistakeTags: confirmed ? [] : ["narrative_attribution_risk"],
    lesson: source.realityCheck,
    relatedEventIds: source.events.map((event) => event.id),
    createdAt: GENERATED_AT,
    updatedAt: GENERATED_AT,
  }
})

function matchesQueryTags(tags: string[], queryTags?: string[]) {
  if (!queryTags?.length) return true
  const normalizedTags = new Set(tags.map((tag) => tag.toLowerCase()))
  return queryTags.some((tag) => normalizedTags.has(tag.toLowerCase()))
}

function caseMatchesQuery(record: ReplayCaseStorageRecord, query?: SimilarEventQuery) {
  if (!query) return true
  if (query.symbol && record.symbol !== query.symbol) return false
  if (query.eventType && record.eventType !== query.eventType) return false
  return matchesQueryTags(record.tags, query.tags)
}

function eventMatchesQuery(event: HistoricalEvent, query?: SimilarEventQuery) {
  if (!query) return true
  if (query.symbol && event.symbol !== query.symbol) return false
  if (query.category && event.category !== query.category) return false
  return matchesQueryTags(event.tags, query.tags)
}

function buildSimilarityReasons(record: ReplayCaseStorageRecord, query: SimilarEventQuery): SimilarEventMatchReason[] {
  const reasons: SimilarEventMatchReason[] = []
  if (query.eventType && query.eventType === record.eventType) reasons.push("same_event_type")
  if (query.symbol && query.symbol === record.symbol) reasons.push("same_symbol")
  if (query.tags?.some((tag) => record.tags.includes(tag))) reasons.push("similar_narrative")
  if (record.eventType === "macro") reasons.push("similar_macro_context")
  if (record.eventType === "liquidity") reasons.push("similar_funding", "similar_open_interest")
  if (record.eventType === "crypto_policy") reasons.push("similar_prediction_market_expectation")
  if (!reasons.length) reasons.push("similar_outcome")
  return reasons
}

export const mockReplayCaseRepository: ReplayCaseRepository = {
  async listCases(query) {
    return STORAGE_CASES.filter((record) => caseMatchesQuery(record, query))
  },
  async getCase(caseId) {
    return STORAGE_CASES.find((record) => record.id === caseId) ?? null
  },
  async listFrames(caseId) {
    return STORAGE_FRAMES.filter((frame) => frame.caseId === caseId).sort((a, b) => a.index - b.index)
  },
  async listEventLinks(caseId) {
    return EVENT_LINKS.filter((link) => link.caseId === caseId)
  },
}

export const mockHistoricalEventRepository: HistoricalEventRepository = {
  async listEvents(query) {
    return HISTORICAL_EVENTS.filter((event) => eventMatchesQuery(event, query))
  },
  async getEvent(eventId) {
    return HISTORICAL_EVENTS.find((event) => event.id === eventId) ?? null
  },
  async findSimilarEvents(query) {
    return getSimilarEventMatches(query)
  },
}

export const mockSetupOutcomeRepository: SetupOutcomeRepository = {
  async listOutcomes(query) {
    return SETUP_OUTCOMES.filter((outcome) => {
      if (!query) return true
      if (query.symbol && outcome.symbol !== query.symbol) return false
      return matchesQueryTags([outcome.setupName, outcome.thesis, ...outcome.mistakeTags], query.tags)
    })
  },
  async getOutcome(outcomeId) {
    return SETUP_OUTCOMES.find((outcome) => outcome.id === outcomeId) ?? null
  },
  async getOutcomeStatistics(query) {
    return getSetupOutcomeStats(query)
  },
}

export function getAllReplayCases(): ReplayCase[] {
  return STORAGE_CASES.map((record) => {
    const events = HISTORICAL_EVENTS.filter((event) => event.relatedCaseIds?.includes(record.id))
    return mapStorageReplayCaseToReplayCase(record, STORAGE_FRAMES, events)
  })
}

export function getReplayCaseById(id: string): ReplayCase | null {
  return getAllReplayCases().find((replay) => replay.id === id) ?? null
}

export function getReplayCasesByEventType(eventType: HistoricalReplayEventType): ReplayCase[] {
  const caseIds = new Set(STORAGE_CASES.filter((record) => record.eventType === eventType).map((record) => record.id))
  return getAllReplayCases().filter((replay) => caseIds.has(replay.id))
}

export function getHistoricalEventsByCaseId(caseId: string): HistoricalEvent[] {
  return HISTORICAL_EVENTS.filter((event) => event.relatedCaseIds?.includes(caseId))
}

export function getSimilarEventMatches(query: SimilarEventQuery): SimilarEventMatch[] {
  const matches = STORAGE_CASES.filter((record) => caseMatchesQuery(record, query)).map((record) => {
    const reasons = buildSimilarityReasons(record, query)
    const matchedTags = (query.tags ?? []).filter((tag) => record.tags.includes(tag))
    const baseScore = 55 + reasons.length * 9 + matchedTags.length * 4

    return {
      caseId: record.id,
      title: record.title,
      symbol: record.symbol,
      timestamp: record.eventWindow?.start ?? record.createdAt,
      similarityScore: Math.min(96, baseScore),
      reasons,
      matchedTags,
      outcome: record.outcome,
      verdict: record.verdict,
      operatorRead: record.realityCheck,
      keyDifferences: [
        query.eventType && query.eventType !== record.eventType ? `Event type differs: ${record.eventType}` : "",
        query.symbol && query.symbol !== record.symbol ? `Asset differs: ${record.symbol}` : "",
      ].filter(Boolean),
      takeaway: `Use ${record.title} as mock historical context, then validate whether drivers and verdict match the current setup.`,
    }
  })

  return matches
    .filter((match) => match.similarityScore >= (query.minSimilarityScore ?? 0))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, query.limit ?? matches.length)
}

export function getSetupOutcomeStats(query?: SimilarEventQuery): OutcomeStatistics {
  const outcomes = SETUP_OUTCOMES.filter((outcome) => {
    if (!query) return true
    if (query.symbol && outcome.symbol !== query.symbol) return false
    return matchesQueryTags([outcome.setupName, outcome.thesis, ...outcome.mistakeTags], query.tags)
  })
  const sampleSize = outcomes.length
  const returns = outcomes.map((outcome) => outcome.realizedReturnPct ?? 0)
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const wins = outcomes.filter((outcome) => outcome.tradeOutcome === "win").length
  const falseNarratives = outcomes.filter((outcome) => outcome.mistakeTags.includes("narrative_attribution_risk")).length

  return {
    sampleSize,
    winRate: sampleSize ? Math.round((wins / sampleSize) * 100) : 0,
    averageReturnPct: sampleSize ? Number((returns.reduce((sum, value) => sum + value, 0) / sampleSize).toFixed(2)) : 0,
    medianReturnPct: sampleSize ? sortedReturns[Math.floor(sampleSize / 2)] : 0,
    averageHoldMinutes: sampleSize
      ? Math.round(outcomes.reduce((sum, outcome) => sum + (outcome.holdMinutes ?? 0), 0) / sampleSize)
      : 0,
    falseNarrativeRate: sampleSize ? Math.round((falseNarratives / sampleSize) * 100) : 0,
  }
}

export function getReplayCaseCatalog(): ReplayCaseCatalogEntry[] {
  const replayCases = getAllReplayCases()
  return STORAGE_CASES.map((record) => ({
    id: record.id,
    eventType: record.eventType ?? "mixed",
    shockLevel: record.shockLevel ?? "medium",
    replay: replayCases.find((replay) => replay.id === record.id) ?? mapStorageReplayCaseToReplayCase(record, STORAGE_FRAMES),
  }))
}
