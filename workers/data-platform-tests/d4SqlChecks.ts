import { readFileSync } from "node:fs"
import path from "node:path"
import { D4_MIGRATION_ORDER } from "@/lib/data-platform/consistency-evidence/postgres"

const root = path.join(process.cwd(), "lib", "data-platform", "consistency-evidence", "postgres", "migrations")
const sql = D4_MIGRATION_ORDER.map((name) => readFileSync(path.join(root, name), "utf8")).join("\n")
const roleMigrationPrefixes = ["007_", "008_", "010_", "012_"]
const nonRoleSql = D4_MIGRATION_ORDER.filter((name) => !roleMigrationPrefixes.some((prefix) => name.startsWith(prefix))).map((name) => readFileSync(path.join(root, name), "utf8")).join("\n")
export const d4MigrationNamesValid = D4_MIGRATION_ORDER.every((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)) && new Set(D4_MIGRATION_ORDER.map((name) => name.slice(0, 3))).size === D4_MIGRATION_ORDER.length
export const d4MigrationOrderIsolated = D4_MIGRATION_ORDER.join(",") === "001_consistency_contracts.sql,002_evidence_contracts.sql,003_projection_and_roles.sql,004_consistency_run_lifecycle.sql,005_immutable_consistency_results.sql,006_dependency_recompute.sql,007_phase2v_certification_hardening.sql,008_core_evidence_assembly.sql,009_mvp_evidence_activation.sql,010_mvp_consumer_projections.sql,011_mvp_projection_read_grants.sql,012_mvp_projection_exposure_decisions.sql,013_mvp_projection_exposure_invalidations.sql"
export const consistencyTablesPresent = ["consistency.rule_sets", "consistency.rules", "consistency.rule_runs", "consistency.inputs", "consistency.rule_results", "consistency.result_diagnostics", "consistency.recompute_requests"].every((table) => sql.includes("CREATE TABLE " + table))
export const d2TableNamesNotReused = !sql.includes("CREATE TABLE consistency.runs") && !sql.includes("CREATE TABLE consistency.results")
export const evidenceTablesPresent = ["evidence.profiles", "evidence.candidates", "evidence.packet_identities", "evidence.packet_versions", "evidence.fact_references", "evidence.consistency_references", "evidence.requirements", "evidence.confidence_components", "evidence.explanation_codes", "evidence.packet_supersessions", "evidence.invalidation_events"].every((table) => sql.includes("CREATE TABLE " + table))
export const projectionTablesPresent = sql.includes("CREATE TABLE projection.evidence_projection_definitions") && sql.includes("CREATE TABLE projection.evidence_projection_versions")
export const exactFactVersionsRequired = sql.includes("record_version integer NOT NULL CHECK (record_version > 0)") && sql.includes("canonical_record_id text NOT NULL")
export const knowledgeModesClosed = sql.includes("'AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE'")
export const conflictsVisible = sql.includes("'SUPPORTING','CONFLICTING'") && sql.includes("'MISSING','UNSUPPORTED','INAPPLICABLE'")
export const noOpaquePacketJson = !/packet_payload\s+jsonb/i.test(sql) && !/canonical_fact\s+jsonb/i.test(sql)
export const noExecutableRoleDdl = !/CREATE ROLE|CREATE USER/i.test(nonRoleSql) && ["qt_d4_consistency_worker", "qt_d4_read_only", "qt_d4_evidence_assembler", "qt_d4_projection_builder", "qt_d4_projection_publisher"].every((role) => sql.includes(`CREATE ROLE ${role}`))
export const noD2D3MigrationReference = !sql.includes("D2_ISOLATED_POSTGRES_URL") && !sql.includes("D3_ISOLATED_POSTGRES_URL")
