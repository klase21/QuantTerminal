import type { DatasetDependency } from "./datasetDependency"
import type { ProviderTier } from "./providerRegistry"
import type { ReplayCapability } from "./replayCapability"

export type DatasetClass = "FACT_FIXED_CADENCE" | "FACT_EVENT" | "FACT_EVENT_STREAM" | "FACT_SNAPSHOT" | "DOCUMENT" | "PROJECTION" | "EVIDENCE" | "CONTROL_PLANE" | "DERIVED_INTELLIGENCE"
export type StorageClass = "POSTGRES_FACT" | "POSTGRES_METADATA" | "OBJECT_STORAGE_RAW" | "OBJECT_STORAGE_COLUMNAR" | "MATERIALIZED_VIEW" | "EXTERNAL_ONLY"
export type ConsumerPage = "DASHBOARD" | "MARKETS" | "RESEARCH" | "REPLAY" | "SCANNER" | "TRADE" | "NONE"
export type GovernancePolicyState = "APPROVED" | "PROPOSED"

export interface PolicyReference { policyId: string; version: string; state: GovernancePolicyState }
export interface DatasetRegistryEntry {
  datasetId: string; displayName: string; domainOwner: string; canonicalOwner: string; datasetClass: DatasetClass
  primaryProvider: string | null; approvedFallbacks: readonly string[]; providerTierRequirement: ProviderTier
  canonicalSchema: string; schemaVersion: string; identityRule: string; versioningRule: string; normalizationRule: string
  qualityPolicy: PolicyReference; coveragePolicy: PolicyReference; freshnessPolicy: PolicyReference; consistencyPolicy: PolicyReference
  publicationPolicy: PolicyReference; retentionPolicy: PolicyReference; storageClasses: readonly StorageClass[]; partitionPolicy: PolicyReference
  populationFrequency: PolicyReference; reconciliationFrequency: PolicyReference; consumerPages: readonly ConsumerPage[]
  repositoryTraceability: "RECORD_LEVEL" | "SOURCE_LEVEL" | "NONE"; evidenceEligibility: boolean
  sensitivity: "PUBLIC" | "INTERNAL" | "RESTRICTED"; freeTierPriority: "P0" | "P1" | "P2" | "NOT_APPLICABLE"
  operationalSla: PolicyReference; registryVersion: string; effectiveAt: string; supersedesVersion: string | null
  replayCapability: ReplayCapability; dependencies: readonly DatasetDependency[]
}

export function validateDatasetRegistry(entries: readonly DatasetRegistryEntry[]): readonly string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const entry of entries) {
    if (!entry.datasetId || ids.has(entry.datasetId)) errors.push(`DUPLICATE_OR_MISSING_DATASET:${entry.datasetId}`)
    ids.add(entry.datasetId)
    if (!entry.canonicalOwner) errors.push(`MISSING_CANONICAL_OWNER:${entry.datasetId}`)
    if (!entry.storageClasses.length) errors.push(`MISSING_STORAGE_CLASS:${entry.datasetId}`)
    if (!entry.registryVersion || !entry.schemaVersion) errors.push(`MISSING_VERSION:${entry.datasetId}`)
  }
  return errors
}
