import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import type { D3PostgresClient } from "./client"
import { D3_MIGRATION_ROOT } from "./migrationRunner"

const PRE_005_MIGRATION_IDS = ["001", "002", "003", "004"] as const
const CURRENT_CATCHUP_MIGRATION_ID = "005"
const CURRENT_CATCHUP_MIGRATION_FILE = "005_population_pipeline_integrity.sql"

/**
 * This is deliberately an object-by-object catalogue inspection rather than a
 * ledger check.  A repaired ledger is only safe when the pre-005 D3 schema is
 * present with its expected object families; the query includes every table's
 * columns/types/nullability and every constraint/index/function/grant so an
 * operator can retain the evidence that was used for the decision.
 */
export const D3_PRE_005_STRUCTURAL_INSPECTION_SQL = `
SELECT jsonb_build_object(
  'schemas', (SELECT coalesce(jsonb_agg(n.nspname ORDER BY n.nspname), '[]'::jsonb) FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('control','population','quality','coverage')),
  'tables', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema', n.nspname, 'table', c.relname) ORDER BY n.nspname, c.relname), '[]'::jsonb) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname IN ('control','population','quality','coverage')),
  'columns', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema', n.nspname, 'table', c.relname, 'column', a.attname, 'type', pg_catalog.format_type(a.atttypid,a.atttypmod), 'notNull', a.attnotnull) ORDER BY n.nspname,c.relname,a.attnum), '[]'::jsonb) FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN ('r','p') AND n.nspname IN ('control','population','quality','coverage')),
  'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',co.conname,'type',co.contype,'definition',pg_catalog.pg_get_constraintdef(co.oid,true)) ORDER BY n.nspname,c.relname,co.conname), '[]'::jsonb) FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('control','population','quality','coverage')),
  'indexes', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'table',t.relname,'name',i.relname,'definition',pg_catalog.pg_get_indexdef(i.oid)) ORDER BY n.nspname,t.relname,i.relname), '[]'::jsonb) FROM pg_catalog.pg_index x JOIN pg_catalog.pg_class i ON i.oid=x.indexrelid JOIN pg_catalog.pg_class t ON t.oid=x.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('control','population','quality','coverage')),
  'enums', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',t.typname,'labels',(SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder) FROM pg_catalog.pg_enum e WHERE e.enumtypid=t.oid)) ORDER BY n.nspname,t.typname), '[]'::jsonb) FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace WHERE t.typtype='e' AND n.nspname='control'),
  'functions', (SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'identity',pg_catalog.pg_get_function_identity_arguments(p.oid),'definition',pg_catalog.pg_get_functiondef(p.oid),'securityDefiner',p.prosecdef,'configuration',coalesce(to_jsonb(p.proconfig),'[]'::jsonb)) ORDER BY n.nspname,p.proname,pg_catalog.pg_get_function_identity_arguments(p.oid)), '[]'::jsonb) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='control' AND p.proname IN ('claim_population_unit','heartbeat_population_lease','advance_population_unit')),
  'roles', (SELECT coalesce(jsonb_agg(r.rolname ORDER BY r.rolname), '[]'::jsonb) FROM pg_catalog.pg_roles r WHERE r.rolname IN ('qt_d3_scheduler','qt_d3_coordinator','qt_d3_worker','qt_d3_read_only')),
  'grants', (SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',grantee,'schema',table_schema,'table',table_name,'privilege',privilege_type) ORDER BY grantee,table_schema,table_name,privilege_type), '[]'::jsonb) FROM information_schema.role_table_grants WHERE grantee IN ('qt_d3_scheduler','qt_d3_coordinator','qt_d3_worker','qt_d3_read_only') AND table_schema IN ('control','population','quality','coverage')),
  'columnGrants', (SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',grantee,'schema',table_schema,'table',table_name,'column',column_name,'privilege',privilege_type) ORDER BY grantee,table_schema,table_name,column_name,privilege_type), '[]'::jsonb) FROM information_schema.column_privileges WHERE grantee IN ('qt_d3_scheduler','qt_d3_coordinator','qt_d3_worker','qt_d3_read_only') AND table_schema IN ('control','population','quality','coverage'))
) AS snapshot`

export interface D3StructuralInspection {
  readonly schemas: readonly string[]
  readonly tables: readonly { readonly schema: string; readonly table: string }[]
  readonly columns: readonly { readonly schema: string; readonly table: string; readonly column: string; readonly type: string; readonly notNull: boolean }[]
  readonly constraints: readonly { readonly schema: string; readonly table: string; readonly name: string; readonly type: string; readonly definition: string }[]
  readonly indexes: readonly { readonly schema: string; readonly table: string; readonly name: string; readonly definition: string }[]
  readonly enums: readonly { readonly schema: string; readonly name: string; readonly labels: readonly string[] }[]
  readonly functions: readonly { readonly schema: string; readonly name: string; readonly identity: string; readonly definition: string; readonly securityDefiner: boolean; readonly configuration: readonly string[] }[]
  readonly roles: readonly string[]
  readonly grants: readonly { readonly grantee: string; readonly schema: string; readonly table: string; readonly privilege: string }[]
  readonly columnGrants: readonly { readonly grantee: string; readonly schema: string; readonly table: string; readonly column: string; readonly privilege: string }[]
}

export interface CurrentCatchupSchemaRepairPort {
  readonly roleIntent: D3PostgresClient["roleIntent"]
  inspectPre005Structure(): Promise<D3StructuralInspection>
  readLedger(): Promise<readonly { readonly migrationId: string; readonly checksum: string; readonly appliedAt: string; readonly appliedBy: string }[]>
  transaction<T>(work: (port: Pick<CurrentCatchupSchemaRepairPort, "execute">) => Promise<T>): Promise<T>
  execute(sql: string, parameters?: readonly unknown[]): Promise<void>
}

export type CurrentCatchupSchemaRepairResult =
  | { readonly status: "ALREADY_APPLIED"; readonly migrationId: "005"; readonly checksum: string }
  | { readonly status: "REPAIRED"; readonly migrationId: "005"; readonly checksum: string }

const REQUIRED_TABLES = ["control.population_migration_ledger","control.population_jobs","control.population_job_events","control.population_runs","control.population_run_events","control.population_units","control.population_unit_events","control.population_leases","control.population_checkpoints","control.retrieval_attempts","control.population_outcomes","control.retry_events","coverage.watermark_eligibility_decisions","population.candidates","population.candidate_conflicts","population.canonical_submissions","quality.candidate_validation_results","quality.candidate_evaluation_runs","quality.candidate_evaluation_results"] as const
const REQUIRED_ENUMS = ["population_job_state","population_run_state","population_unit_state","population_outcome_kind"] as const
const REQUIRED_FUNCTIONS = ["claim_population_unit","heartbeat_population_lease","advance_population_unit"] as const
const REQUIRED_ROLES = ["qt_d3_scheduler","qt_d3_coordinator","qt_d3_worker","qt_d3_read_only"] as const
const REQUIRED_ENUM_LABELS: Readonly<Record<(typeof REQUIRED_ENUMS)[number], readonly string[]>> = {
  population_job_state: ["QUEUED","RUNNING","PARTIAL","SUCCEEDED","FAILED","CANCELLED","PAUSED","EXPIRED"],
  population_run_state: ["CREATED","RUNNING","SUCCEEDED","PARTIAL","FAILED","CANCELLED","EXPIRED"],
  population_unit_state: ["PENDING","LEASED","RETRIEVING","RAW_PERSISTED","CANDIDATES_READY","PROCESSING","COMPLETED","RETRYABLE","QUARANTINED","FAILED","CANCELLED"],
  population_outcome_kind: ["COMMITTED","DUPLICATE","CONFLICT","QUARANTINED","EMPTY","UNSUPPORTED","RETRYABLE_FAILURE","PERMANENT_FAILURE","CANCELLED","SKIPPED_BY_POLICY"],
}
const REQUIRED_INDEXES = ["population_jobs_delivery_identity_uq","population_units_claim_idx","population_leases_expiry_idx","population_runs_resume_idx","retrieval_attempts_unit_idx","population_outcomes_unit_idx","population_candidate_source_idx","population_submissions_unresolved_idx","population_retry_ready_idx","population_unit_events_reconcile_idx"] as const
const REQUIRED_GRANTS = ["qt_d3_scheduler:control:population_jobs:SELECT","qt_d3_scheduler:control:population_jobs:INSERT","qt_d3_worker:population:candidates:SELECT","qt_d3_worker:population:candidates:INSERT","qt_d3_read_only:population:canonical_submissions:SELECT"] as const
export const D3_PRE_005_REQUIRED_COLUMNS: Readonly<Record<(typeof REQUIRED_TABLES)[number], readonly string[]>> = {
  "control.population_migration_ledger": ["migration_id:text:true","migration_checksum:text:true","applied_at:timestamp with time zone:true","applied_by:text:true"],
  "control.population_jobs": ["job_id:text:true","request_identity:text:true","occurrence_identity:text:true","intentional_rerun_identity:text:false","profile_id:text:true","profile_version:text:true","dataset_id:text:true","provider_id:text:true","scope_fingerprint:text:true","current_state:control.population_job_state:true","current_event_id:text:true","requested_at:timestamp with time zone:true","requested_by:text:true","created_at:timestamp with time zone:true","updated_at:timestamp with time zone:true"],
  "control.population_job_events": ["event_id:text:true","job_id:text:true","event_type:text:true","previous_state:control.population_job_state:false","next_state:control.population_job_state:true","actor_id:text:true","occurred_at:timestamp with time zone:true","details:jsonb:true"],
  "control.population_runs": ["run_id:text:true","job_id:text:true","attempt_number:integer:true","current_state:control.population_run_state:true","worker_pool_id:text:false","started_at:timestamp with time zone:false","heartbeat_at:timestamp with time zone:false","completed_at:timestamp with time zone:false","retry_classification_id:text:false","current_checkpoint_id:text:false"],
  "control.population_run_events": ["event_id:text:true","run_id:text:true","event_type:text:true","previous_state:control.population_run_state:false","next_state:control.population_run_state:true","actor_id:text:true","occurred_at:timestamp with time zone:true"],
  "control.population_units": ["unit_id:text:true","job_id:text:true","profile_id:text:true","profile_version:text:true","dataset_id:text:true","provider_id:text:true","provider_snapshot_id:text:true","policy_version_id:text:true","venue:text:false","subject_or_symbol:text:false","window_start:timestamp with time zone:false","window_end:timestamp with time zone:false","resolution:text:false","partition_key:text:false","request_fingerprint:text:true","request_parameters:jsonb:true","required:boolean:true","current_state:control.population_unit_state:true","attempt_count:integer:true","current_fencing_token:bigint:true","active_lease_id:text:false","current_checkpoint_id:text:false","cancellation_requested_at:timestamp with time zone:false","created_at:timestamp with time zone:true","updated_at:timestamp with time zone:true"],
  "control.population_unit_events": ["event_id:text:true","unit_id:text:true","run_id:text:false","event_type:text:true","previous_state:control.population_unit_state:false","next_state:control.population_unit_state:true","fencing_token:bigint:false","actor_id:text:true","occurred_at:timestamp with time zone:true","details:jsonb:true"],
  "control.population_leases": ["lease_id:text:true","unit_id:text:true","owner_id:text:true","fencing_token:bigint:true","lease_version:bigint:true","acquired_at:timestamp with time zone:true","expires_at:timestamp with time zone:true","heartbeat_at:timestamp with time zone:true","released_at:timestamp with time zone:false","release_reason:text:false"],
  "control.population_checkpoints": ["checkpoint_id:text:true","job_id:text:true","run_id:text:true","unit_id:text:true","fencing_token:bigint:true","checkpoint_type:text:true","completed_stage:control.population_unit_state:true","raw_manifest_id:text:false","candidate_cursor:text:false","canonical_submission_id:text:false","last_outcome_id:text:false","created_at:timestamp with time zone:true"],
  "control.retrieval_attempts": ["attempt_id:text:true","unit_id:text:true","run_id:text:true","provider_id:text:true","provider_snapshot_id:text:true","request_fingerprint:text:true","started_at:timestamp with time zone:true","completed_at:timestamp with time zone:false","outcome:text:false","status_code:integer:false","retry_after:text:false","response_media_type:text:false","raw_byte_count:bigint:false","raw_manifest_id:text:false","error_class:text:false","error_code:text:false","retry_classification_id:text:false"],
  "control.population_outcomes": ["outcome_id:text:true","job_id:text:true","run_id:text:true","unit_id:text:true","candidate_id:text:false","retrieval_attempt_id:text:false","raw_manifest_id:text:false","submission_id:text:false","outcome_kind:control.population_outcome_kind:true","d2_result_status:text:true","canonical_commit_id:text:false","conflict_id:text:false","quarantine_id:text:false","fencing_token:bigint:true","reason_codes:text[]:true","created_at:timestamp with time zone:true"],
  "control.retry_events": ["retry_event_id:text:true","job_id:text:true","run_id:text:false","unit_id:text:true","retrieval_attempt_id:text:false","candidate_id:text:false","classification_id:text:true","retry_policy_id:text:true","retry_policy_version:text:true","retry_after:timestamp with time zone:false","created_at:timestamp with time zone:true"],
  "coverage.watermark_eligibility_decisions": ["decision_id:text:true","unit_id:text:true","dataset_id:text:true","provider_id:text:true","bounded_dimensions:jsonb:true","outcome_ids:text[]:true","required_unit_policy_id:text:true","eligibility_result:text:true","blocking_reasons:text[]:true","policy_version_id:text:true","created_at:timestamp with time zone:true"],
  "population.candidates": ["candidate_id:text:true","unit_id:text:true","retrieval_attempt_id:text:true","raw_manifest_id:text:true","dataset_id:text:true","provider_id:text:true","provider_snapshot_id:text:true","source_observation_id:text:true","source_observed_at:timestamp with time zone:true","effective_at:timestamp with time zone:false","parser_version:text:true","candidate_schema_version:text:true","candidate_kind:text:true","bounded_payload:jsonb:true","candidate_checksum:text:true","validation_status:text:true","quality_eligibility:text:true","normalization_eligibility:text:true","created_at:timestamp with time zone:true"],
  "population.candidate_conflicts": ["conflict_id:text:true","candidate_id:text:true","existing_checksum:text:true","incoming_checksum:text:true","detected_at:timestamp with time zone:true"],
  "population.canonical_submissions": ["submission_id:text:true","candidate_id:text:true","idempotency_key:text:true","canonical_commit_id:text:false","canonical_record_id:text:false","record_version:integer:false","result_status:text:true","submitted_at:timestamp with time zone:true","resolved_at:timestamp with time zone:false"],
  "quality.candidate_validation_results": ["validation_run_id:text:true","candidate_id:text:false","retrieval_attempt_id:text:false","validation_layer:text:true","rule_id:text:true","rule_version:text:true","outcome:text:true","blocking:boolean:true","failure_routing:text:false","policy_version_id:text:true","diagnostics:jsonb:true","created_at:timestamp with time zone:true"],
  "quality.candidate_evaluation_runs": ["evaluation_run_id:text:true","unit_id:text:true","policy_version_id:text:true","provider_certification_snapshot_id:text:true","created_at:timestamp with time zone:true"],
  "quality.candidate_evaluation_results": ["quality_result_id:text:true","evaluation_run_id:text:true","candidate_id:text:false","result_level:text:true","rule_id:text:true","rule_version:text:true","outcome:text:true","created_at:timestamp with time zone:true"],
}
const MIGRATION_005_SUBMISSION_COLUMNS = new Set(["unit_id","retrieval_attempt_id","raw_manifest_id","expected_canonical_record_id","expected_record_version","expected_fact_checksum","command_checksum"])

export type Pre005StructureState = "EXACT" | "INCOMPLETE" | "CONFLICTING"

export function classifyPre005D3Structure(snapshot: D3StructuralInspection): Pre005StructureState {
  const tableNames = new Set(snapshot.tables.map((item) => `${item.schema}.${item.table}`))
  const enumNames = new Set(snapshot.enums.filter((item) => item.schema === "control").map((item) => item.name))
  const functionNames = new Set(snapshot.functions.filter((item) => item.schema === "control").map((item) => item.name))
  const roleNames = new Set(snapshot.roles)
  const requiredObjectsPresent = REQUIRED_TABLES.every((name) => tableNames.has(name) && snapshot.columns.some((column) => `${column.schema}.${column.table}` === name) && snapshot.constraints.some((constraint) => `${constraint.schema}.${constraint.table}` === name))
    && REQUIRED_ENUMS.every((name) => enumNames.has(name)) && REQUIRED_FUNCTIONS.every((name) => functionNames.has(name)) && REQUIRED_ROLES.every((name) => roleNames.has(name))
  if (!requiredObjectsPresent) return "INCOMPLETE"
  const exactColumns = REQUIRED_TABLES.every((name) => {
    const actual = snapshot.columns
      .filter((column) => `${column.schema}.${column.table}` === name && !(name === "population.canonical_submissions" && MIGRATION_005_SUBMISSION_COLUMNS.has(column.column)))
      .map((column) => `${column.column}:${column.type}:${column.notNull}`)
    const expected = D3_PRE_005_REQUIRED_COLUMNS[name]
    return actual.length === expected.length && expected.every((column) => actual.includes(column))
  })
  const exactEnums = snapshot.enums.every((item) => item.schema !== "control" || !(item.name in REQUIRED_ENUM_LABELS) || item.labels.join("|") === REQUIRED_ENUM_LABELS[item.name as keyof typeof REQUIRED_ENUM_LABELS].join("|"))
  const exactIndexes = REQUIRED_INDEXES.every((name) => snapshot.indexes.some((index) => index.name === name && /^CREATE (UNIQUE )?INDEX /.test(index.definition)))
  const exactFunctions = REQUIRED_FUNCTIONS.every((name) => snapshot.functions.some((fn) => fn.name === name && fn.securityDefiner && fn.configuration.includes("search_path=control, pg_temp")))
  const grantKeys = new Set(snapshot.grants.map((grant) => `${grant.grantee}:${grant.schema}:${grant.table}:${grant.privilege}`))
  const exactGrants = REQUIRED_GRANTS.every((grant) => grantKeys.has(grant))
  // The ledger table and candidate-kind constraint are stable named/defined
  // anchors for the full pre-005 constraint graph, including the 003/004 kind extensions.
  const exactConstraints = snapshot.constraints.some((item) => item.schema === "control" && item.table === "population_migration_ledger" && item.type === "p" && /PRIMARY KEY \(migration_id\)/.test(item.definition))
    && snapshot.constraints.some((item) => item.schema === "population" && item.table === "candidates" && item.name === "candidates_candidate_kind_check" && item.type === "c" && item.definition.includes("ETF_FLOW_OBSERVATION"))
  return exactColumns && exactEnums && exactIndexes && exactFunctions && exactGrants && exactConstraints ? "EXACT" : "CONFLICTING"
}

export function isExactPre005D3Structure(snapshot: D3StructuralInspection): boolean { return classifyPre005D3Structure(snapshot) === "EXACT" }

export function isExactPost005CurrentCatchupStructure(snapshot: D3StructuralInspection): boolean {
  const eventColumns = new Set(snapshot.columns.filter((item) => item.schema === "population" && item.table === "canonical_submission_events").map((item) => `${item.column}:${item.type}:${item.notNull}`))
  const submissionColumns = new Set(snapshot.columns.filter((item) => item.schema === "population" && item.table === "canonical_submissions").map((item) => `${item.column}:${item.type}:${item.notNull}`))
  const eventConstraints = snapshot.constraints.filter((item) => item.schema === "population" && item.table === "canonical_submission_events")
  const submissionConstraints = snapshot.constraints.filter((item) => item.schema === "population" && item.table === "canonical_submissions")
  const grants = new Set(snapshot.grants.map((grant) => `${grant.grantee}:${grant.schema}.${grant.table}:${grant.privilege}`))
  const columnGrants = new Set(snapshot.columnGrants.map((grant) => `${grant.grantee}:${grant.schema}.${grant.table}:${grant.column}:${grant.privilege}`))
  return eventColumns.size === 7
    && ["event_id:text:true","submission_id:text:true","event_type:text:true","event_checksum:text:true","details:jsonb:true","fencing_token:bigint:true","created_at:timestamp with time zone:true"].every((column) => eventColumns.has(column))
    && ["unit_id:text:false","retrieval_attempt_id:text:false","raw_manifest_id:text:false","expected_canonical_record_id:text:false","expected_record_version:integer:false","expected_fact_checksum:text:false","command_checksum:text:false"].every((column) => submissionColumns.has(column))
    && eventConstraints.some((item) => item.type === "p" && /PRIMARY KEY \(event_id\)/.test(item.definition))
    && eventConstraints.some((item) => item.type === "f" && /FOREIGN KEY \(submission_id\) REFERENCES population\.canonical_submissions\(submission_id\)/.test(item.definition))
    && eventConstraints.some((item) => item.type === "c" && item.definition.includes("SUBMISSION_PREPARED") && item.definition.includes("CHECKPOINT_RECORDED"))
    && eventConstraints.some((item) => item.type === "c" && item.definition.includes("event_checksum") && item.definition.includes("[0-9a-f]{64}"))
    && eventConstraints.some((item) => item.type === "c" && item.definition.includes("fencing_token > 0"))
    && submissionConstraints.some((item) => item.type === "f" && /FOREIGN KEY \(unit_id\) REFERENCES control\.population_units\(unit_id\)/.test(item.definition))
    && submissionConstraints.some((item) => item.type === "f" && /FOREIGN KEY \(retrieval_attempt_id\) REFERENCES control\.retrieval_attempts\(attempt_id\)/.test(item.definition))
    && submissionConstraints.some((item) => item.type === "f" && /FOREIGN KEY \(raw_manifest_id\) REFERENCES raw\.objects\(object_id\)/.test(item.definition))
    && submissionConstraints.some((item) => item.name === "canonical_submissions_expected_fact_checksum_check" && item.type === "c")
    && submissionConstraints.some((item) => item.name === "canonical_submissions_command_checksum_check" && item.type === "c")
    && snapshot.indexes.some((item) => item.name === "idx_canonical_submission_events_submission")
    && grants.has("qt_d3_worker:population.canonical_submission_events:SELECT")
    && grants.has("qt_d3_worker:population.canonical_submission_events:INSERT")
    && grants.has("qt_d3_read_only:population.canonical_submission_events:SELECT")
    && ["result_status","canonical_commit_id","canonical_record_id","record_version","resolved_at"].every((column) => columnGrants.has(`qt_d3_worker:population.canonical_submissions:${column}:UPDATE`))
}

export async function createCurrentCatchupSchemaRepairPort(client: D3PostgresClient): Promise<CurrentCatchupSchemaRepairPort> {
  const execute = async (sql: string, parameters: readonly unknown[] = []) => { await client.sql.unsafe(sql, parameters as never[]) }
  return Object.freeze({
    roleIntent: client.roleIntent,
    async inspectPre005Structure() {
      const rows = await client.sql.unsafe<{ readonly snapshot: D3StructuralInspection }[]>(D3_PRE_005_STRUCTURAL_INSPECTION_SQL)
      return rows[0]?.snapshot ?? emptyInspection()
    },
    async readLedger() {
      const rows = await client.sql.unsafe<{ readonly migration_id: string; readonly migration_checksum: string; readonly applied_at: string; readonly applied_by: string }[]>("SELECT migration_id,migration_checksum,applied_at::text,applied_by FROM control.population_migration_ledger WHERE migration_id = ANY($1::text[]) ORDER BY migration_id", [[...PRE_005_MIGRATION_IDS, CURRENT_CATCHUP_MIGRATION_ID]])
      return rows.map((row) => Object.freeze({ migrationId: row.migration_id, checksum: row.migration_checksum, appliedAt: row.applied_at, appliedBy: row.applied_by }))
    },
    transaction: async <T>(work: (port: Pick<CurrentCatchupSchemaRepairPort, "execute">) => Promise<T>) => client.transaction(async (sql) => work({ execute: async (statement, parameters = []) => { await sql.unsafe(statement, parameters as never[]) } })),
    execute,
  })
}

function emptyInspection(): D3StructuralInspection { return { schemas: [], tables: [], columns: [], constraints: [], indexes: [], enums: [], functions: [], roles: [], grants: [], columnGrants: [] } }

function hasAnyMigration005Structure(snapshot: D3StructuralInspection): boolean {
  return snapshot.tables.some((item) => item.schema === "population" && item.table === "canonical_submission_events")
    || snapshot.columns.some((item) => item.schema === "population" && item.table === "canonical_submissions" && ["unit_id","retrieval_attempt_id","raw_manifest_id","expected_canonical_record_id","expected_record_version","expected_fact_checksum","command_checksum"].includes(item.column))
    || snapshot.constraints.some((item) => ["canonical_submissions_expected_fact_checksum_check","canonical_submissions_command_checksum_check"].includes(item.name))
    || snapshot.indexes.some((item) => item.name === "idx_canonical_submission_events_submission")
}

export async function repairCurrentCatchupSchema(port: CurrentCatchupSchemaRepairPort, appliedBy: string, migrationRoot = D3_MIGRATION_ROOT): Promise<CurrentCatchupSchemaRepairResult> {
  if (port.roleIntent !== "MIGRATION_OWNER" || !appliedBy.trim()) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_OWNER_REQUIRED")
  const artifactSql = await readFile(path.join(migrationRoot, CURRENT_CATCHUP_MIGRATION_FILE), "utf8")
  const checksum = createHash("sha256").update(artifactSql).digest("hex")
  const [structure, ledger] = await Promise.all([port.inspectPre005Structure(), port.readLedger()])
  const migrationIds = new Set(ledger.map((entry) => entry.migrationId))
  if (PRE_005_MIGRATION_IDS.some((id) => !migrationIds.has(id))) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_PRE005_PARTIAL")
  const structureState = classifyPre005D3Structure(structure)
  if (structureState === "INCOMPLETE") throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_PRE005_INCOMPLETE")
  if (structureState === "CONFLICTING") throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_PRE005_CONFLICTING")
  const existing = ledger.find((entry) => entry.migrationId === CURRENT_CATCHUP_MIGRATION_ID)
  if (existing) {
    if (existing.checksum !== checksum) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_005_CONFLICT")
    if (!isExactPost005CurrentCatchupStructure(structure)) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_005_POSTCONDITION_FAILED")
    return Object.freeze({ status: "ALREADY_APPLIED", migrationId: "005", checksum })
  }
  if (hasAnyMigration005Structure(structure)) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_005_PARTIAL")
  await port.transaction(async (transaction) => {
    await transaction.execute(artifactSql)
    await transaction.execute("INSERT INTO control.population_migration_ledger(migration_id,migration_checksum,applied_at,applied_by) VALUES($1,$2,now(),$3)", [CURRENT_CATCHUP_MIGRATION_ID, checksum, appliedBy])
  })
  const [postStructure, postLedger] = await Promise.all([port.inspectPre005Structure(), port.readLedger()])
  if (!isExactPost005CurrentCatchupStructure(postStructure)) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_005_POSTCONDITION_FAILED")
  const beforePre005 = ledger.filter((entry) => PRE_005_MIGRATION_IDS.includes(entry.migrationId as (typeof PRE_005_MIGRATION_IDS)[number]))
  const afterPre005 = postLedger.filter((entry) => PRE_005_MIGRATION_IDS.includes(entry.migrationId as (typeof PRE_005_MIGRATION_IDS)[number]))
  if (JSON.stringify(beforePre005) !== JSON.stringify(afterPre005)) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_PRE005_LEDGER_MUTATED")
  const applied = postLedger.find((entry) => entry.migrationId === CURRENT_CATCHUP_MIGRATION_ID)
  if (!applied || applied.checksum !== checksum) throw new Error("D3_CURRENT_CATCHUP_SCHEMA_REPAIR_005_LEDGER_POSTCONDITION_FAILED")
  return Object.freeze({ status: "REPAIRED", migrationId: "005", checksum })
}
