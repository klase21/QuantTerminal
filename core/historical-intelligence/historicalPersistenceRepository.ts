import type { DecisionRecord, OutcomeRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { MemoryRecord, ReplayCaseRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export interface HistoricalPersistenceListQuery {
  limit?: number
  cursor?: string
  symbol?: string
  tags?: string[]
  start?: string
  end?: string
  status?: "draft" | "active" | "archived"
}

export interface HistoricalPersistenceListResult<TRecord> {
  records: TRecord[]
  nextCursor?: string
}

export type HistoricalPersistenceCreateInput<TRecord extends { id: string }> = Omit<TRecord, "id">
export type HistoricalPersistenceUpdateInput<TRecord> = Partial<TRecord>

export interface HistoricalRecordRepository<TRecord extends { id: string }> {
  list(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<TRecord>>
  getById(id: string): Promise<TRecord | null>
  create(record: HistoricalPersistenceCreateInput<TRecord>): Promise<TRecord>
  update(id: string, updates: HistoricalPersistenceUpdateInput<TRecord>): Promise<TRecord>
}

export interface ReplayCaseRecordRepository extends HistoricalRecordRepository<ReplayCaseRecord> {
  findByEventId(eventId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<ReplayCaseRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<ReplayCaseRecord>>
}

export interface DecisionRecordRepository extends HistoricalRecordRepository<DecisionRecord> {
  findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<DecisionRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<DecisionRecord>>
}

export interface OutcomeRecordRepository extends HistoricalRecordRepository<OutcomeRecord> {
  findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<OutcomeRecord>>
  findByDecisionId(decisionId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<OutcomeRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<OutcomeRecord>>
}

export interface EventRecordRepository extends HistoricalRecordRepository<EventRecord> {
  findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<EventRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<EventRecord>>
}

export interface MemoryRecordRepository extends HistoricalRecordRepository<MemoryRecord> {
  findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<MemoryRecord>>
  findByEventId(eventId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<MemoryRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<MemoryRecord>>
}

export interface PlaybookRecordRepository extends HistoricalRecordRepository<PlaybookRecord> {
  findByCaseId(caseId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<PlaybookRecord>>
  findByEventId(eventId: string, query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<PlaybookRecord>>
  findRecent(query?: HistoricalPersistenceListQuery): Promise<HistoricalPersistenceListResult<PlaybookRecord>>
}

export interface HistoricalPersistenceRepository {
  replayCases: ReplayCaseRecordRepository
  decisions: DecisionRecordRepository
  outcomes: OutcomeRecordRepository
  events: EventRecordRepository
  memories: MemoryRecordRepository
  playbooks: PlaybookRecordRepository
}
