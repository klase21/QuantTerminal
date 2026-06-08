import type { DecisionRecord, OutcomeRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type {
  HistoricalPersistenceCreateInput,
  HistoricalPersistenceListQuery,
  HistoricalPersistenceListResult,
  HistoricalPersistenceRepository,
  HistoricalPersistenceUpdateInput,
  HistoricalRecordRepository,
} from "./historicalPersistenceRepository"
import type { HistoricalRecordAudit, MemoryRecord, ReplayCaseRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

type RepositoryRecord = {
  id: string
  status?: "draft" | "active" | "archived"
  symbol?: string
  tags?: string[]
  audit?: HistoricalRecordAudit
}

const NOW = "2026-06-07T00:00:00.000Z"
const AUDIT: HistoricalRecordAudit = {
  createdAt: NOW,
  updatedAt: NOW,
  schemaVersion: 1,
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function recordTime(record: RepositoryRecord) {
  const dynamicRecord = record as {
    timestamp?: unknown
    decidedAt?: unknown
    observedAt?: unknown
    eventWindow?: unknown
  }
  const candidate =
    dynamicRecord.timestamp ??
    dynamicRecord.decidedAt ??
    dynamicRecord.observedAt ??
    dynamicRecord.eventWindow ??
    record.audit?.updatedAt ??
    record.audit?.createdAt

  if (typeof candidate === "string") return candidate
  if (candidate && typeof candidate === "object" && "start" in candidate) {
    const window = candidate as { start?: unknown }
    return typeof window.start === "string" ? window.start : ""
  }
  return ""
}

function applyQuery<TRecord extends RepositoryRecord>(
  records: TRecord[],
  query?: HistoricalPersistenceListQuery,
) {
  const filtered = records.filter((record) => {
    if (query?.status && record.status !== query.status) return false
    if (query?.symbol && record.symbol !== query.symbol) return false
    if (query?.tags?.length && !query.tags.every((tag) => record.tags?.includes(tag))) return false

    const timestamp = recordTime(record)
    if (query?.start && timestamp && timestamp < query.start) return false
    if (query?.end && timestamp && timestamp > query.end) return false
    return true
  })

  const offset = query?.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0
  const limit = query?.limit ?? filtered.length
  const recordsPage = filtered.slice(offset, offset + limit)
  const nextCursor = offset + limit < filtered.length ? String(offset + limit) : undefined

  return {
    records: recordsPage.map(clone),
    nextCursor,
  }
}

class MockRecordRepository<TRecord extends RepositoryRecord>
  implements HistoricalRecordRepository<TRecord>
{
  private nextId = 1

  constructor(
    private readonly prefix: string,
    private records: TRecord[],
  ) {}

  async list(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<TRecord>> {
    return applyQuery(this.records, query)
  }

  async getById(id: string): Promise<TRecord | null> {
    const record = this.records.find((item) => item.id === id)
    return record ? clone(record) : null
  }

  async create(record: HistoricalPersistenceCreateInput<TRecord>): Promise<TRecord> {
    const nextRecord = {
      ...record,
      id: `${this.prefix}-${String(this.nextId++).padStart(4, "0")}`,
    } as TRecord

    this.records = [...this.records, nextRecord]
    return clone(nextRecord)
  }

  async update(id: string, updates: HistoricalPersistenceUpdateInput<TRecord>): Promise<TRecord> {
    const index = this.records.findIndex((item) => item.id === id)
    if (index === -1) throw new Error(`Historical persistence record not found: ${id}`)

    const current = this.records[index]!
    const nextRecord = {
      ...current,
      ...updates,
      id: current.id,
      audit: current.audit
        ? {
            ...current.audit,
            ...(updates as { audit?: HistoricalRecordAudit }).audit,
            updatedAt: NOW,
          }
        : current.audit,
    }

    this.records = this.records.map((item, itemIndex) => (itemIndex === index ? (nextRecord as TRecord) : item))
    return clone(nextRecord as TRecord)
  }

  protected findWhere(
    predicate: (record: TRecord) => boolean,
    query?: HistoricalPersistenceListQuery,
  ): HistoricalPersistenceListResult<TRecord> {
    return applyQuery(this.records.filter(predicate), query)
  }

  protected recent(query?: HistoricalPersistenceListQuery): HistoricalPersistenceListResult<TRecord> {
    const sorted = [...this.records].sort((a, b) => recordTime(b).localeCompare(recordTime(a)))
    return applyQuery(sorted, query)
  }
}

class MockReplayCaseRepository extends MockRecordRepository<ReplayCaseRecord> {
  async findByEventId(eventId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.relatedEventIds.includes(eventId), query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

class MockDecisionRepository extends MockRecordRepository<DecisionRecord> {
  async findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.caseId === caseId, query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

class MockOutcomeRepository extends MockRecordRepository<OutcomeRecord> {
  async findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.caseId === caseId, query)
  }

  async findByDecisionId(decisionId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.decisionId === decisionId, query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

class MockEventRepository extends MockRecordRepository<EventRecord> {
  async findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.relatedCaseIds.includes(caseId), query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

class MockMemoryRepository extends MockRecordRepository<MemoryRecord> {
  async findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.caseId === caseId, query)
  }

  async findByEventId(eventId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.eventIds.includes(eventId), query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

class MockPlaybookRepository extends MockRecordRepository<PlaybookRecord> {
  async findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.caseId === caseId || record.relatedCaseIds.includes(caseId), query)
  }

  async findByEventId(eventId: string, query?: HistoricalPersistenceListQuery) {
    return this.findWhere((record) => record.tags.includes(eventId), query)
  }

  async findRecent(query?: HistoricalPersistenceListQuery) {
    return this.recent(query)
  }
}

const replayCaseRecords: ReplayCaseRecord[] = [
  {
    id: "case-btc-spacex-narrative",
    title: "BTC Selloff Attributed to SpaceX IPO Narrative",
    symbol: "BTCUSDT",
    assetClass: "crypto",
    timeframe: "1D",
    eventWindow: {
      start: "2025-11-18T09:00:00.000Z",
      peak: "2025-11-18T14:00:00.000Z",
      end: "2025-11-19T09:00:00.000Z",
    },
    eventType: "narrative_shock",
    shockLevel: "high",
    setup: "Headline-driven BTC selloff with derivatives stress.",
    outcome: "Flow and leverage mattered more than the headline attribution.",
    verdict: "Reality Diverged",
    verdictSummary: "Narrative attribution was incomplete.",
    realityCheck: "Funding and OI compression explained the move better than the SpaceX IPO claim.",
    narrativeClaim: "SpaceX IPO narrative caused the BTC selloff.",
    tags: ["btc", "narrative", "oi_compression", "funding_reset"],
    sourceIds: ["source-mock-terminal"],
    relatedEventIds: ["event-btc-spacex-headline"],
    relatedDecisionIds: ["decision-btc-spacex-wait"],
    relatedOutcomeIds: ["outcome-btc-spacex-mixed"],
    status: "active",
    audit: AUDIT,
  },
]

const eventRecords: EventRecord[] = [
  {
    id: "event-btc-spacex-headline",
    timestamp: "2025-11-18T10:30:00.000Z",
    category: "narrative",
    symbol: "BTCUSDT",
    venue: "manual",
    sourceId: "source-mock-terminal",
    title: "SpaceX IPO narrative blamed for BTC selloff",
    summary: "Mock narrative event used to test replay persistence flows.",
    severity: "HIGH",
    confidence: 61,
    reliability: "derived",
    data: {
      narrative: "SpaceX IPO attribution",
    },
    tags: ["btc", "narrative", "headline_attribution"],
    relatedCaseIds: ["case-btc-spacex-narrative"],
    relatedMemoryIds: ["memory-btc-narrative-risk"],
    impact: {
      direction: "bearish",
      affectedAssets: ["BTCUSDT"],
      expectedImpactWindow: "hours",
      realizedMovePct: -4.2,
      tacticalRead: "Treat headline as possible context, not confirmed driver.",
    },
    narrative: {
      claim: "SpaceX IPO narrative caused the selloff.",
      contradiction: ["OI compression and funding decline were already visible."],
      conclusion: "Narrative was likely secondary.",
      narrativeTags: ["headline_attribution", "flow_confirmation_required"],
    },
    status: "active",
    audit: AUDIT,
  },
]

const memoryRecords: MemoryRecord[] = [
  {
    id: "memory-btc-narrative-risk",
    caseId: "case-btc-spacex-narrative",
    eventIds: ["event-btc-spacex-headline"],
    memoryType: "tactical_takeaway",
    title: "Narrative attribution needs flow confirmation",
    summary: "Headline narratives are weaker when funding and OI are already unwinding.",
    confidence: 74,
    tags: ["narrative", "flow_confirmation", "btc"],
    data: {
      regime: "leveraged_long_unwind",
    },
    sourceIds: ["source-mock-terminal"],
    status: "active",
    audit: AUDIT,
  },
]

const decisionRecords: DecisionRecord[] = [
  {
    id: "decision-btc-spacex-wait",
    caseId: "case-btc-spacex-narrative",
    mode: "hypothetical",
    decidedAt: "2025-11-18T10:45:00.000Z",
    symbol: "BTCUSDT",
    decision: "wait",
    decisionReason: "Driver stack was mixed; flow confirmation was required before acting on the headline.",
    invalidationCondition: "OI expands against the move while funding diverges.",
    expectedOutcome: "Choppy downside until leverage resets.",
    actualOutcome: "Selloff stabilized after funding and OI compressed.",
    mistakeTag: "headline_attribution_risk",
    lesson: "Do not trade headline attribution without flow confirmation.",
    futureRule: "Check OI, funding, liquidity sweep, and structure before following narrative.",
    confidence: 76,
    sourceIds: ["source-mock-terminal"],
    relatedOutcomeId: "outcome-btc-spacex-mixed",
    status: "active",
    audit: AUDIT,
  },
]

const outcomeRecords: OutcomeRecord[] = [
  {
    id: "outcome-btc-spacex-mixed",
    caseId: "case-btc-spacex-narrative",
    decisionId: "decision-btc-spacex-wait",
    symbol: "BTCUSDT",
    observedAt: "2025-11-19T09:00:00.000Z",
    outcome: "avoided",
    realizedMovePct: -4.2,
    maxAdverseMovePct: -1.1,
    maxFavorableMovePct: 2.4,
    holdMinutes: 0,
    expectedOutcome: "Choppy downside until leverage resets.",
    actualOutcome: "Avoiding the narrative chase reduced execution risk.",
    mistakeTags: ["headline_attribution_risk"],
    lesson: "Waiting for derivatives confirmation was the useful decision.",
    futureRule: "Avoid narrative-only entries when flow evidence is incomplete.",
    confidence: 79,
    tags: ["btc", "avoid", "flow_confirmation"],
    sourceIds: ["source-mock-terminal"],
    status: "active",
    audit: AUDIT,
  },
]

const playbookRecords: PlaybookRecord[] = [
  {
    id: "playbook-btc-narrative-flow-check",
    caseId: "case-btc-spacex-narrative",
    title: "Narrative Shock Flow Confirmation",
    category: "flow",
    outcomeBias: "wait",
    historicalLesson: "Narrative attribution alone was insufficient.",
    keyMistake: "Assuming the headline was the primary driver.",
    keyConfirmationSignal: "OI compression with funding decline.",
    bestExecutionCondition: "Funding, OI, liquidity, and structure align after the first reaction.",
    worstExecutionCondition: "Headline is loud but flow evidence is mixed.",
    futurePlaybook: ["Check OI trend", "Check funding divergence", "Check liquidity sweep", "Confirm structure"],
    executionChecklist: [
      {
        id: "check-funding",
        label: "Funding checked",
        category: "flow",
        required: true,
        weight: 0.25,
      },
      {
        id: "check-oi",
        label: "OI checked",
        category: "flow",
        required: true,
        weight: 0.25,
      },
    ],
    invalidationChecklist: [
      {
        id: "invalid-oi-expands",
        label: "OI expanding opposite direction",
        category: "flow",
        required: true,
        weight: 0.35,
      },
    ],
    relatedCaseIds: ["case-btc-spacex-narrative"],
    relatedMemoryIds: ["memory-btc-narrative-risk"],
    confidence: 78,
    tags: ["event-btc-spacex-headline", "narrative", "flow_confirmation"],
    status: "active",
    audit: AUDIT,
  },
]

export function createMockHistoricalPersistenceRepository(): HistoricalPersistenceRepository {
  return {
    replayCases: new MockReplayCaseRepository("case", clone(replayCaseRecords)),
    decisions: new MockDecisionRepository("decision", clone(decisionRecords)),
    outcomes: new MockOutcomeRepository("outcome", clone(outcomeRecords)),
    events: new MockEventRepository("event", clone(eventRecords)),
    memories: new MockMemoryRepository("memory", clone(memoryRecords)),
    playbooks: new MockPlaybookRepository("playbook", clone(playbookRecords)),
  }
}

export const mockHistoricalPersistenceRepository = createMockHistoricalPersistenceRepository()
