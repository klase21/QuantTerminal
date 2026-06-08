import { createDecision, createEvent, createMemory, createPlaybook } from "./historicalPersistenceWriteService"
import { normalizeMockHistoricalEvent } from "./historicalEventIngestionMapper"
import type { HistoricalIngestionResult, HistoricalRawMockEvent } from "./historicalEventIngestionTypes"

export async function ingestMockHistoricalEvent(raw: HistoricalRawMockEvent): Promise<HistoricalIngestionResult> {
  const normalized = normalizeMockHistoricalEvent(raw)
  const event = await createEvent(normalized.event)
  const memory = normalized.memoryCandidate
    ? await createMemory({
        ...normalized.memoryCandidate,
        eventIds: [event.id],
      })
    : undefined
  const decision = normalized.decisionCandidate ? await createDecision(normalized.decisionCandidate) : undefined
  const playbook = normalized.playbookCandidate ? await createPlaybook(normalized.playbookCandidate) : undefined

  return {
    ok: true,
    sourceKind: normalized.sourceKind,
    event,
    memory,
    decision,
    playbook,
  }
}
