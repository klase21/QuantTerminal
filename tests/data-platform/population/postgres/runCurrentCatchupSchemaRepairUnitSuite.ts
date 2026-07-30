import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import {
  D3_PRE_005_REQUIRED_COLUMNS,
  repairCurrentCatchupSchema,
  type CurrentCatchupSchemaRepairPort,
  type D3StructuralInspection,
} from "@/lib/data-platform/population/postgres"

const ROOT = path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "migrations")
const PRE_005 = ["001", "002", "003", "004"] as const
const TABLES = ["control.population_migration_ledger","control.population_jobs","control.population_job_events","control.population_runs","control.population_run_events","control.population_units","control.population_unit_events","control.population_leases","control.population_checkpoints","control.retrieval_attempts","control.population_outcomes","control.retry_events","coverage.watermark_eligibility_decisions","population.candidates","population.candidate_conflicts","population.canonical_submissions","quality.candidate_validation_results","quality.candidate_evaluation_runs","quality.candidate_evaluation_results"] as const

function completeStructure(include005 = false): D3StructuralInspection {
  const eventColumns = ["event_id:text:true","submission_id:text:true","event_type:text:true","event_checksum:text:true","details:jsonb:true","fencing_token:bigint:true","created_at:timestamp with time zone:true"]
  const submission005Columns = ["unit_id:text:false","retrieval_attempt_id:text:false","raw_manifest_id:text:false","expected_canonical_record_id:text:false","expected_record_version:integer:false","expected_fact_checksum:text:false","command_checksum:text:false"]
  return {
    schemas: ["control", "population", "quality", "coverage"],
    tables: [...TABLES.map((value) => { const [schema, table] = value.split("."); return { schema: schema!, table: table! } }), ...(include005 ? [{ schema: "population", table: "canonical_submission_events" }] : [])],
    columns: [...TABLES.flatMap((value) => { const [schema, table] = value.split("."); return D3_PRE_005_REQUIRED_COLUMNS[value].map((signature) => { const parts = signature.split(":"); return { schema: schema!, table: table!, column: parts[0]!, type: parts.slice(1, -1).join(":"), notNull: parts.at(-1) === "true" } }) }), ...(include005 ? [...eventColumns.map((value) => { const parts = value.split(":"); return { schema: "population", table: "canonical_submission_events", column: parts[0]!, type: parts.slice(1, -1).join(":"), notNull: parts.at(-1) === "true" } }), ...submission005Columns.map((value) => { const parts = value.split(":"); return { schema: "population", table: "canonical_submissions", column: parts[0]!, type: parts.slice(1, -1).join(":"), notNull: parts.at(-1) === "true" } })] : [])],
    constraints: [...TABLES.map((value) => { const [schema, table] = value.split("."); return { schema: schema!, table: table!, name: `${table}_pkey`, type: "p", definition: table === "population_migration_ledger" ? "PRIMARY KEY (migration_id)" : "PRIMARY KEY (id)" } }), { schema: "population", table: "candidates", name: "candidates_candidate_kind_check", type: "c", definition: "CHECK (candidate_kind IN ('ETF_FLOW_OBSERVATION'))" }, ...(include005 ? [{ schema: "population", table: "canonical_submission_events", name: "canonical_submission_events_pkey", type: "p", definition: "PRIMARY KEY (event_id)" }, { schema: "population", table: "canonical_submission_events", name: "canonical_submission_events_submission_id_fkey", type: "f", definition: "FOREIGN KEY (submission_id) REFERENCES population.canonical_submissions(submission_id)" }, { schema: "population", table: "canonical_submission_events", name: "event_type", type: "c", definition: "CHECK (event_type IN ('SUBMISSION_PREPARED','CHECKPOINT_RECORDED'))" }, { schema: "population", table: "canonical_submission_events", name: "event_checksum", type: "c", definition: "CHECK (event_checksum ~ '[0-9a-f]{64}')" }, { schema: "population", table: "canonical_submission_events", name: "fencing_token", type: "c", definition: "CHECK (fencing_token > 0)" }, { schema: "population", table: "canonical_submissions", name: "canonical_submissions_unit_id_fkey", type: "f", definition: "FOREIGN KEY (unit_id) REFERENCES control.population_units(unit_id)" }, { schema: "population", table: "canonical_submissions", name: "canonical_submissions_retrieval_attempt_id_fkey", type: "f", definition: "FOREIGN KEY (retrieval_attempt_id) REFERENCES control.retrieval_attempts(attempt_id)" }, { schema: "population", table: "canonical_submissions", name: "canonical_submissions_raw_manifest_id_fkey", type: "f", definition: "FOREIGN KEY (raw_manifest_id) REFERENCES raw.objects(object_id)" }, { schema: "population", table: "canonical_submissions", name: "canonical_submissions_expected_fact_checksum_check", type: "c", definition: "CHECK (true)" }, { schema: "population", table: "canonical_submissions", name: "canonical_submissions_command_checksum_check", type: "c", definition: "CHECK (true)" }] : [])],
    indexes: ["population_jobs_delivery_identity_uq","population_units_claim_idx","population_leases_expiry_idx","population_runs_resume_idx","retrieval_attempts_unit_idx","population_outcomes_unit_idx","population_candidate_source_idx","population_submissions_unresolved_idx","population_retry_ready_idx","population_unit_events_reconcile_idx",...(include005 ? ["idx_canonical_submission_events_submission"] : [])].map((name) => ({ schema: "control", table: "population_jobs", name, definition: `CREATE INDEX ${name}` })),
    enums: [{ name: "population_job_state", labels: ["QUEUED","RUNNING","PARTIAL","SUCCEEDED","FAILED","CANCELLED","PAUSED","EXPIRED"] }, { name: "population_run_state", labels: ["CREATED","RUNNING","SUCCEEDED","PARTIAL","FAILED","CANCELLED","EXPIRED"] }, { name: "population_unit_state", labels: ["PENDING","LEASED","RETRIEVING","RAW_PERSISTED","CANDIDATES_READY","PROCESSING","COMPLETED","RETRYABLE","QUARANTINED","FAILED","CANCELLED"] }, { name: "population_outcome_kind", labels: ["COMMITTED","DUPLICATE","CONFLICT","QUARANTINED","EMPTY","UNSUPPORTED","RETRYABLE_FAILURE","PERMANENT_FAILURE","CANCELLED","SKIPPED_BY_POLICY"] }].map(({ name, labels }) => ({ schema: "control", name, labels })),
    functions: ["claim_population_unit", "heartbeat_population_lease", "advance_population_unit"].map((name) => ({ schema: "control", name, identity: "", definition: "CREATE FUNCTION", securityDefiner: true, configuration: ["search_path=control, pg_temp"] })),
    roles: ["qt_d3_scheduler", "qt_d3_coordinator", "qt_d3_worker", "qt_d3_read_only"],
    grants: [{ grantee: "qt_d3_scheduler", schema: "control", table: "population_jobs", privilege: "SELECT" }, { grantee: "qt_d3_scheduler", schema: "control", table: "population_jobs", privilege: "INSERT" }, { grantee: "qt_d3_worker", schema: "population", table: "candidates", privilege: "SELECT" }, { grantee: "qt_d3_worker", schema: "population", table: "candidates", privilege: "INSERT" }, { grantee: "qt_d3_read_only", schema: "population", table: "canonical_submissions", privilege: "SELECT" }, ...(include005 ? [{ grantee: "qt_d3_worker", schema: "population", table: "canonical_submission_events", privilege: "SELECT" }, { grantee: "qt_d3_worker", schema: "population", table: "canonical_submission_events", privilege: "INSERT" }, { grantee: "qt_d3_read_only", schema: "population", table: "canonical_submission_events", privilege: "SELECT" }] : [])],
    columnGrants: include005 ? ["result_status","canonical_commit_id","canonical_record_id","record_version","resolved_at"].map((column) => ({ grantee: "qt_d3_worker", schema: "population", table: "canonical_submissions", column, privilege: "UPDATE" })) : [],
  }
}

function port(input: { readonly ledger: readonly { readonly migrationId: string; readonly checksum: string; readonly appliedAt: string; readonly appliedBy: string }[]; readonly structure?: D3StructuralInspection; readonly roleIntent?: CurrentCatchupSchemaRepairPort["roleIntent"] }) {
  const executed: Array<{ readonly sql: string; readonly parameters: readonly unknown[] }> = []
  const ledger = [...input.ledger]
  let transactions = 0
  const execute = async (sql: string, parameters: readonly unknown[] = []) => {
    executed.push({ sql, parameters })
    if (sql.startsWith("INSERT INTO control.population_migration_ledger")) ledger.push({ migrationId: parameters[0] as string, checksum: parameters[1] as string, appliedAt: "2026-07-30T00:00:00.000Z", appliedBy: parameters[2] as string })
  }
  const fake: CurrentCatchupSchemaRepairPort = {
    roleIntent: input.roleIntent ?? "MIGRATION_OWNER",
    inspectPre005Structure: async () => input.structure ?? completeStructure(ledger.some((entry) => entry.migrationId === "005")),
    readLedger: async () => ledger,
    execute,
    transaction: async (work) => { transactions += 1; return work({ execute }) },
  }
  return { fake, executed, transactions: () => transactions, ledger: () => [...ledger] }
}

async function checksum005() {
  return createHash("sha256").update(await readFile(path.join(ROOT, "005_population_pipeline_integrity.sql"), "utf8")).digest("hex")
}

async function main() {
  const checksum = await checksum005()
  const historical = PRE_005.map((migrationId, index) => ({ migrationId, checksum: String(index + 1).repeat(64), appliedAt: `2026-01-0${index + 1}T00:00:00.000Z`, appliedBy: `legacy-${index + 1}` }))

  const repaired = port({ ledger: historical })
  const repair = await repairCurrentCatchupSchema(repaired.fake, "d3-maintenance", ROOT)
  assert.deepEqual(repair, { status: "REPAIRED", migrationId: "005", checksum })
  assert.equal(repaired.transactions(), 1)
  assert.equal(repaired.executed.length, 2)
  assert.match(repaired.executed[0]!.sql, /canonical_submission_events/)
  assert.deepEqual(repaired.executed[1]!.parameters, ["005", checksum, "d3-maintenance"])
  assert.deepEqual(repaired.ledger().slice(0, 4), historical)
  assert.equal(repaired.ledger().filter((entry) => entry.migrationId === "005").length, 1)

  const alreadyApplied = port({ ledger: [...historical, { migrationId: "005", checksum, appliedAt: "2026-01-05T00:00:00.000Z", appliedBy: "legacy" }] })
  assert.deepEqual(await repairCurrentCatchupSchema(alreadyApplied.fake, "d3-maintenance", ROOT), { status: "ALREADY_APPLIED", migrationId: "005", checksum })
  assert.equal(alreadyApplied.transactions(), 0)

  const partial = port({ ledger: historical.slice(0, 3) })
  await assert.rejects(() => repairCurrentCatchupSchema(partial.fake, "d3-maintenance", ROOT), /PRE005_PARTIAL/)
  assert.equal(partial.transactions(), 0)

  const malformed = completeStructure()
  const missingColumn = { ...malformed, columns: malformed.columns.filter((column) => `${column.schema}.${column.table}` !== "population.candidates") }
  const structuralDrift = port({ ledger: historical, structure: missingColumn })
  await assert.rejects(() => repairCurrentCatchupSchema(structuralDrift.fake, "d3-maintenance", ROOT), /PRE005_INCOMPLETE/)
  assert.equal(structuralDrift.transactions(), 0)

  const compatibleStructure = completeStructure()
  const conflictingStructure = { ...compatibleStructure, enums: compatibleStructure.enums.map((item, index) => index === 0 ? { ...item, labels: ["QUEUED"] } : item) }
  const structuralConflict = port({ ledger: historical, structure: conflictingStructure })
  await assert.rejects(() => repairCurrentCatchupSchema(structuralConflict.fake, "d3-maintenance", ROOT), /PRE005_CONFLICTING/)
  assert.equal(structuralConflict.transactions(), 0)

  const pre005Structure = completeStructure()
  const partial005Structure = { ...pre005Structure, tables: [...pre005Structure.tables, { schema: "population", table: "canonical_submission_events" }] }
  const partial005 = port({ ledger: historical, structure: partial005Structure })
  await assert.rejects(() => repairCurrentCatchupSchema(partial005.fake, "d3-maintenance", ROOT), /005_PARTIAL/)
  assert.equal(partial005.transactions(), 0)

  const conflicting = port({ ledger: [...historical, { migrationId: "005", checksum: "f".repeat(64), appliedAt: "2026-01-05T00:00:00.000Z", appliedBy: "legacy" }] })
  await assert.rejects(() => repairCurrentCatchupSchema(conflicting.fake, "d3-maintenance", ROOT), /005_CONFLICT/)
  assert.equal(conflicting.transactions(), 0)
  console.log("D3 CURRENT CATCHUP SCHEMA REPAIR UNIT SUITE: PASS")
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
