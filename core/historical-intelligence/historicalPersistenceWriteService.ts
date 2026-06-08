import type { DecisionRecord, OutcomeRecord } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import {
  assertValidPersistenceRecord,
  validateDecisionRecord,
  validateEventRecord,
  validateMemoryRecord,
  validateOutcomeRecord,
  validatePlaybookRecord,
  validateReplayCaseRecord,
} from "./historicalPersistenceValidation"
import { mockHistoricalPersistenceRepository } from "./mockHistoricalPersistenceRepository"
import type { MemoryRecord, ReplayCaseRecord } from "./historicalRecordTypes"
import type { PlaybookRecord } from "./playbookRecordTypes"

export async function createDecision(record: Omit<DecisionRecord, "id">) {
  assertValidPersistenceRecord(validateDecisionRecord(record))
  return mockHistoricalPersistenceRepository.decisions.create(record)
}

export async function createOutcome(record: Omit<OutcomeRecord, "id">) {
  assertValidPersistenceRecord(validateOutcomeRecord(record))
  return mockHistoricalPersistenceRepository.outcomes.create(record)
}

export async function createEvent(record: Omit<EventRecord, "id">) {
  assertValidPersistenceRecord(validateEventRecord(record))
  return mockHistoricalPersistenceRepository.events.create(record)
}

export async function createMemory(record: Omit<MemoryRecord, "id">) {
  assertValidPersistenceRecord(validateMemoryRecord(record))
  return mockHistoricalPersistenceRepository.memories.create(record)
}

export async function createPlaybook(record: Omit<PlaybookRecord, "id">) {
  assertValidPersistenceRecord(validatePlaybookRecord(record))
  return mockHistoricalPersistenceRepository.playbooks.create(record)
}

export async function createReplayCase(record: Omit<ReplayCaseRecord, "id">) {
  assertValidPersistenceRecord(validateReplayCaseRecord(record))
  return mockHistoricalPersistenceRepository.replayCases.create(record)
}
