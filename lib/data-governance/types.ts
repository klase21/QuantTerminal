import type { SourceFreshness } from "@/lib/data-governance/freshness"
import type { SourceQuality } from "@/lib/data-governance/quality"
import type { SourceStatus } from "@/lib/data-governance/sourceStatus"

export const DATA_SOURCE_OWNERS = [
  "dashboard",
  "markets",
  "scanner",
  "research",
  "replay",
  "trade",
  "data_platform",
] as const

export const DATA_SOURCE_CONSUMERS = [
  "dashboard",
  "markets",
  "scanner",
  "research",
  "replay",
  "trade",
  "operations",
] as const

export const SOURCE_CRITICALITIES = ["P0", "P1", "P2"] as const

export type DataSourceOwner = typeof DATA_SOURCE_OWNERS[number]
export type DataSourceConsumer = typeof DATA_SOURCE_CONSUMERS[number]
export type SourceCriticality = typeof SOURCE_CRITICALITIES[number]

export interface DataSourceDefinition {
  id: string
  displayName: string
  authority: string
  owner: DataSourceOwner
  consumers: readonly DataSourceConsumer[]
  cacheable: boolean
  criticality: SourceCriticality
  quality: SourceQuality
  freshness: SourceFreshness
  status: SourceStatus
  fallbackSource: string | null
  productionApproved: boolean
}

export type SourceRegistryValidationIssueCode =
  | "duplicate_id"
  | "inactive_production_source"
  | "fallback_loop"
  | "missing_fallback_source"
  | "missing_owner"
  | "missing_authority"

export interface SourceRegistryValidationIssue {
  code: SourceRegistryValidationIssueCode
  message: string
  sourceId?: string
  relatedSourceId?: string
}

export interface SourceRegistryValidationResult {
  valid: boolean
  sourceCount: number
  productionSourceCount: number
  issues: SourceRegistryValidationIssue[]
}
