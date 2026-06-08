import { mockHistoricalPersistenceRepository } from "./mockHistoricalPersistenceRepository"
import type { DecisionRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord, ReplayCaseRecord } from "./historicalRecordTypes"
import type { HistoricalIntelligenceQuery, HistoricalQueryResult, HistoricalQuerySummary } from "./historicalQueryTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

type SearchableRecord = {
  id: string
  title?: string
  summary?: string
  symbol?: string
  tags?: string[]
}

const DEFAULT_LIMIT = 10

function normalized(value?: string) {
  return value?.trim().toLowerCase() ?? ""
}

function includesText(value: unknown, needle: string) {
  if (!needle) return true
  if (typeof value === "string") return value.toLowerCase().includes(needle)
  if (Array.isArray(value)) return value.some((item) => includesText(item, needle))
  if (value && typeof value === "object") return Object.values(value).some((item) => includesText(item, needle))
  return false
}

function uniqueById<TRecord extends { id: string }>(records: TRecord[]) {
  return [...new Map(records.map((record) => [record.id, record])).values()]
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function scoreSearchable(record: SearchableRecord, query: HistoricalIntelligenceQuery) {
  let score = 0
  const keyword = normalized(query.keyword)
  const narrative = normalized(query.narrative)
  const tag = normalized(query.tag)
  const asset = normalized(query.asset)

  if (query.caseId && record.id === query.caseId) score += 80
  if (asset && normalized(record.symbol) === asset) score += 25
  if (tag && record.tags?.some((item) => normalized(item) === tag)) score += 25
  if (keyword && includesText(record, keyword)) score += 20
  if (narrative && includesText(record, narrative)) score += 20

  return score
}

function filterScored<TRecord extends SearchableRecord>(
  records: TRecord[],
  query: HistoricalIntelligenceQuery,
  additionalScore: (record: TRecord) => number = () => 0,
) {
  const hasSearch =
    Boolean(query.keyword) ||
    Boolean(query.caseId) ||
    Boolean(query.eventType) ||
    Boolean(query.asset) ||
    Boolean(query.narrative) ||
    Boolean(query.tag)

  return records
    .map((record) => ({
      record,
      score: scoreSearchable(record, query) + additionalScore(record),
    }))
    .filter((item) => !hasSearch || item.score > 0)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .map((item) => item.record)
}

function summarize(result: Omit<HistoricalQueryResult, "summary">): HistoricalQuerySummary {
  const total =
    result.replayCases.length +
    result.relatedEvents.length +
    result.relatedMemories.length +
    result.relatedDecisions.length +
    result.relatedPlaybooks.length
  const signals = [
    result.query.keyword ? "keyword" : null,
    result.query.caseId ? "case" : null,
    result.query.eventType ? "event type" : null,
    result.query.asset ? "asset" : null,
    result.query.narrative ? "narrative" : null,
    result.query.tag ? "tag" : null,
  ].filter((signal): signal is string => Boolean(signal))

  if (!total) {
    return {
      confidence: 0,
      readability: "empty",
      matchedSignals: signals,
      summary: "No mock persistence records matched this historical intelligence query.",
    }
  }

  const confidence = clamp(45 + signals.length * 8 + Math.min(total, 8) * 3)
  const readability = total <= 3 ? "narrow" : total <= 8 ? "focused" : "broad"

  return {
    confidence,
    readability,
    matchedSignals: signals,
    summary: `Found ${total} mock persistence records across replay cases, events, memories, decisions, and playbooks.`,
  }
}

export async function queryHistoricalIntelligence(query: HistoricalIntelligenceQuery = {}): Promise<HistoricalQueryResult> {
  const limit = query.limit ?? DEFAULT_LIMIT
  const [caseResult, eventResult, memoryResult, decisionResult, playbookResult] = await Promise.all([
    mockHistoricalPersistenceRepository.replayCases.list(),
    mockHistoricalPersistenceRepository.events.list(),
    mockHistoricalPersistenceRepository.memories.list(),
    mockHistoricalPersistenceRepository.decisions.list(),
    mockHistoricalPersistenceRepository.playbooks.list(),
  ])

  const replayCases = filterScored(caseResult.records, query, (record) => {
    let score = 0
    if (query.caseId && record.id === query.caseId) score += 100
    if (query.eventType && record.eventType === query.eventType) score += 35
    if (query.narrative && includesText(record.narrativeClaim, normalized(query.narrative))) score += 20
    return score
  }).slice(0, limit)

  const caseIds = new Set(replayCases.map((record) => record.id))
  if (query.caseId) caseIds.add(query.caseId)

  const eventIds = new Set(replayCases.flatMap((record) => record.relatedEventIds))

  const relatedEvents = filterScored(eventResult.records, query, (record) => {
    let score = 0
    if (record.relatedCaseIds.some((caseId) => caseIds.has(caseId))) score += 60
    if (query.eventType && record.category === "narrative" && query.eventType === "narrative_shock") score += 20
    if (query.narrative && includesText(record.narrative, normalized(query.narrative))) score += 20
    return score
  }).slice(0, limit)

  relatedEvents.forEach((record) => eventIds.add(record.id))

  const relatedMemories = filterScored(memoryResult.records, query, (record) => {
    let score = 0
    if (record.caseId && caseIds.has(record.caseId)) score += 55
    if (record.eventIds.some((eventId) => eventIds.has(eventId))) score += 30
    return score
  }).slice(0, limit)

  const relatedDecisions = filterScored(decisionResult.records, query, (record) => {
    let score = 0
    if (caseIds.has(record.caseId)) score += 60
    if (query.narrative && includesText(record.decisionReason, normalized(query.narrative))) score += 15
    return score
  }).slice(0, limit)

  const relatedPlaybooks = filterScored(playbookResult.records, query, (record) => {
    let score = 0
    if (record.caseId && caseIds.has(record.caseId)) score += 55
    if (record.relatedCaseIds.some((caseId) => caseIds.has(caseId))) score += 30
    if (record.tags.some((tag) => eventIds.has(tag))) score += 20
    return score
  }).slice(0, limit)

  const resultWithoutSummary = {
    query,
    replayCases: uniqueById(replayCases),
    relatedEvents: uniqueById(relatedEvents),
    relatedMemories: uniqueById(relatedMemories),
    relatedDecisions: uniqueById(relatedDecisions),
    relatedPlaybooks: uniqueById(relatedPlaybooks),
  }

  return {
    ...resultWithoutSummary,
    summary: summarize(resultWithoutSummary),
  }
}
