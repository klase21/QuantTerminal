import type { PublicationDecision } from "./publicationGate"
export type DerivedIntelligenceStatus = "CANDIDATE" | "EXPERIMENTAL" | "CERTIFIED" | "SUSPENDED"
export interface DerivedIntelligenceRegistration {
  modelId: string
  modelVersion: string
  datasetId: string
  inputDatasets: readonly string[]
  inputWatermark: string | null
  inputRecordSetDigest: string | null
  calculationOwner: string
  outputSchemaVersion: string
  limitations: readonly string[]
  publicationPolicy: PublicationDecision
  evidenceEligibility: boolean
  status: DerivedIntelligenceStatus
}
export function validateDerivedIntelligence(value: DerivedIntelligenceRegistration): boolean { return Boolean(value.modelId && value.modelVersion && value.datasetId && value.inputDatasets.length && value.calculationOwner) && (value.status === "CERTIFIED" || value.limitations.length > 0) }
