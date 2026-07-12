import type { QualityResult } from "./dataQuality"

export type QuarantineResolutionType = "PROVIDER_CORRECTION" | "PARSER_FIXED" | "SCHEMA_FIXED" | "DUPLICATE_CONFIRMED" | "ACCEPTED_WITH_LIMITATION" | "PERMANENTLY_REJECTED" | "PROVIDER_CERTIFICATION_CHANGED"

export interface RawObjectReference { objectId: string; uri: string; checksum: string; archivedAt: string }
export interface RepairEvent { repairId: string; resolutionType: QuarantineResolutionType; decidedBy: string; decidedAt: string; notes: readonly string[]; supersedesRecordId?: string }
export interface QuarantinedCandidate {
  quarantineId: string
  datasetId: string
  rawObject: RawObjectReference
  attemptedCanonicalIdentity: string | null
  failedRules: readonly QualityResult[]
  conflictingRecordIds: readonly string[]
  normalizationAttempts: readonly { runId: string; version: string; attemptedAt: string }[]
  operatorDecision: QuarantineResolutionType | null
  resolutionHistory: readonly RepairEvent[]
}

export function validateQuarantineCandidate(value: QuarantinedCandidate): boolean {
  return Boolean(value.quarantineId && value.rawObject.checksum && value.failedRules.length)
}

export function validateRepairAudit(value: RepairEvent): boolean {
  return Boolean(value.repairId && value.decidedBy && value.decidedAt && value.notes.length)
}
