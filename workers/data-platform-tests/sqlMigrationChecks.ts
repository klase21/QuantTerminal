import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { D2_MIGRATION_ORDER, D2_POSTGRES_SCHEMAS } from "@/lib/data-platform/persistence/postgres"

const root = path.join(process.cwd(), "lib", "data-platform", "persistence", "postgres", "migrations")
export const migrationFiles = readdirSync(root).filter((file) => file.endsWith(".sql")).sort()
export const migrationOrderPasses = JSON.stringify(migrationFiles) === JSON.stringify(D2_MIGRATION_ORDER)
export const migrationNumbersUnique = new Set(migrationFiles.map((file) => file.slice(0, 3))).size === migrationFiles.length
const sql = migrationFiles.map((file) => readFileSync(path.join(root, file), "utf8")).join("\n")
export const schemasComplete = D2_POSTGRES_SCHEMAS.every((schema) => sql.includes(`CREATE SCHEMA IF NOT EXISTS ${schema};`))
export const requiredTables = [
  "control.canonical_commits", "control.registry_snapshots", "control.provider_snapshots", "control.policy_versions", "control.migration_ledger", "control.outbox",
  "raw.objects", "raw.retrieval_attempts", "repository.envelopes", "repository.record_versions", "repository.publication_decisions", "repository.supersessions", "repository.lineage_edges",
  "quality.evaluation_runs", "quality.results", "coverage.projection_versions", "coverage.dataset_watermarks", "projection.versions", "projection.record_inputs",
  "evidence.packets", "evidence.record_references", "consistency.runs", "consistency.results", "quarantine.candidates", "quarantine.conflicts", "quarantine.repair_events",
  "canonical.ohlcv", "canonical.funding", "canonical.open_interest", "canonical.liquidations", "canonical.prediction_snapshots", "canonical.etf_observations", "canonical.reserve_observations", "canonical.macro_observations", "canonical.stream_manifests",
]
export const tablesComplete = requiredTables.every((table) => sql.includes(`CREATE TABLE ${table}`))
export const publicationHistoryAppendOnly = sql.includes("CREATE TABLE repository.publication_decisions") && sql.includes("repository.append_publication_decision") && !sql.includes("DELETE FROM repository.publication_decisions")
export const replacementPublicationAtomic = sql.includes("replacement publication requires predecessor decision identity") && sql.includes("current_publication_state = 'SUPERSEDED'") && sql.includes("REPLACEMENT_PUBLISHED")
export const supersessionSeparated = sql.includes("CREATE TABLE repository.supersessions") && !/relationship_type[^\n]+SUPERSEDES/.test(sql)
export const noRawBytes = !/raw_payload|payload_bytes|bytea/i.test(sql)
export const governanceBindingsRequired = ["registry_snapshot_id text NOT NULL", "provider_snapshot_id text NOT NULL", "policy_version_id text NOT NULL", "schema_version text NOT NULL", "normalization_version text NOT NULL"].every((value) => sql.includes(value))
export const certificationBindingRequired = !sql.includes("provider_certification_snapshot_id text NULL") && sql.includes("provider_certification_snapshot_id text NOT NULL")
const canonicalCommitSql = readFileSync(path.join(root, "001_control_and_raw.sql"), "utf8").split("CREATE TABLE control.canonical_commits")[1]?.split("CREATE INDEX idx_canonical_commits")[0] ?? ""
export const commitCertificationBindingRequired = canonicalCommitSql.includes("provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id)")
