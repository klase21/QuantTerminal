import { D2_MIGRATION_ORDER } from "@/lib/data-platform/persistence/postgres"
import { D3_POPULATION_MIGRATION_ORDER } from "@/lib/data-platform/population/postgres"

export interface D3ToD2ForeignKeyDependency {
  readonly sourceTable: string
  readonly sourceColumn: string
  readonly targetTable: string
  readonly targetColumn: string
  readonly purpose: string
}

export const INTEGRATED_BACKFILL_MIGRATION_PLAN = Object.freeze({
  d2: D2_MIGRATION_ORDER,
  d3: D3_POPULATION_MIGRATION_ORDER,
  ledgerOrder: Object.freeze(["control.migration_ledger", "control.population_migration_ledger"] as const),
})

export const D3_TO_D2_FOREIGN_KEY_DEPENDENCIES: readonly D3ToD2ForeignKeyDependency[] = Object.freeze([
  { sourceTable: "control.population_units", sourceColumn: "provider_snapshot_id", targetTable: "control.provider_snapshots", targetColumn: "snapshot_id", purpose: "bind Unit provider governance" },
  { sourceTable: "control.population_units", sourceColumn: "policy_version_id", targetTable: "control.policy_versions", targetColumn: "policy_version_id", purpose: "bind Unit policy governance" },
  { sourceTable: "control.population_checkpoints", sourceColumn: "raw_manifest_id", targetTable: "raw.objects", targetColumn: "object_id", purpose: "bind checkpoint to immutable Raw Artifact" },
  { sourceTable: "control.retrieval_attempts", sourceColumn: "provider_snapshot_id", targetTable: "control.provider_snapshots", targetColumn: "snapshot_id", purpose: "bind Retrieval provider governance" },
  { sourceTable: "control.retrieval_attempts", sourceColumn: "raw_manifest_id", targetTable: "raw.objects", targetColumn: "object_id", purpose: "bind Retrieval to immutable Raw Artifact" },
  { sourceTable: "population.candidates", sourceColumn: "raw_manifest_id", targetTable: "raw.objects", targetColumn: "object_id", purpose: "bind Candidate to immutable Raw Artifact" },
  { sourceTable: "population.candidates", sourceColumn: "provider_snapshot_id", targetTable: "control.provider_snapshots", targetColumn: "snapshot_id", purpose: "bind Candidate provider governance" },
  { sourceTable: "quality.candidate_validation_results", sourceColumn: "policy_version_id", targetTable: "control.policy_versions", targetColumn: "policy_version_id", purpose: "bind validation policy" },
  { sourceTable: "quality.candidate_evaluation_runs", sourceColumn: "policy_version_id", targetTable: "control.policy_versions", targetColumn: "policy_version_id", purpose: "bind evaluation policy" },
  { sourceTable: "quality.candidate_evaluation_runs", sourceColumn: "provider_certification_snapshot_id", targetTable: "control.provider_snapshots", targetColumn: "snapshot_id", purpose: "bind provider certification" },
  { sourceTable: "population.canonical_submissions", sourceColumn: "canonical_commit_id", targetTable: "control.canonical_commits", targetColumn: "commit_id", purpose: "bind submission to D2 Canonical Commit" },
  { sourceTable: "control.population_outcomes", sourceColumn: "raw_manifest_id", targetTable: "raw.objects", targetColumn: "object_id", purpose: "bind outcome to immutable Raw Artifact" },
  { sourceTable: "control.population_outcomes", sourceColumn: "canonical_commit_id", targetTable: "control.canonical_commits", targetColumn: "commit_id", purpose: "bind outcome to D2 Canonical Commit" },
  { sourceTable: "control.population_outcomes", sourceColumn: "conflict_id", targetTable: "quarantine.conflicts", targetColumn: "conflict_id", purpose: "bind outcome to D2 conflict audit" },
  { sourceTable: "control.population_outcomes", sourceColumn: "quarantine_id", targetTable: "quarantine.candidates", targetColumn: "quarantine_id", purpose: "bind outcome to D2 quarantine candidate" },
  { sourceTable: "coverage.watermark_eligibility_decisions", sourceColumn: "policy_version_id", targetTable: "control.policy_versions", targetColumn: "policy_version_id", purpose: "bind Watermark eligibility policy" },
])

export const PROMPT_REPORTED_RAW_AND_COMMIT_FOREIGN_KEY_COUNT = 7 as const
export const COMMITTED_RAW_AND_COMMIT_FOREIGN_KEY_COUNT = 6 as const
export const COMPLETE_D3_TO_D2_FOREIGN_KEY_COUNT = 16 as const
