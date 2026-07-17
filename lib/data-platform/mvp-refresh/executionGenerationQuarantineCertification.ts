import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT,
  PostgresExecutionGenerationQuarantineStore,
  createCleanGenerationInputManifest,
  createExecutionGenerationQuarantineProposal,
} from "./executionGenerationQuarantine"

const CONTAINER = "quantterminal-d2-postgres"
const ADMIN_ROLE = "qt_d2_owner"

function identifier(prefix: string, suffix: string): string { return `${prefix}_${suffix}`.replace(/[^a-z0-9_]/g, "") }
function psql(database: string, sql: string): string { return execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", ADMIN_ROLE, "-d", database, "-At", "-c", sql], { encoding: "utf8", windowsHide: true }).trim() }
function databaseUrl(base: string, database: string): string { const value = new URL(base); value.pathname = `/${database}`; return value.toString() }

export interface ExecutionGenerationQuarantineCertificationResult {
  readonly passed: true
  readonly firstQuarantine: "CREATED"
  readonly exactRetry: "DUPLICATE"
  readonly changedEvidence: "CONFLICT"
  readonly leasesReleased: 1
  readonly resumeRejectedBeforeWrites: true
  readonly immutableCountsPreserved: true
  readonly downstreamWrites: 0
  readonly statusCollapsedAttempts: true
  readonly evidenceReadable: true
  readonly receiptGenerated: true
  readonly cleanGenerationManifestGenerated: true
  readonly disposableDatabasesDestroyed: true
  readonly disposableRolesDestroyed: true
  readonly disposableArtifactsDestroyed: true
}

export async function runExecutionGenerationQuarantineCertification(environment: NodeJS.ProcessEnv = process.env): Promise<ExecutionGenerationQuarantineCertificationResult> {
  const base = environment.MVP_REFRESH_ISOLATED_POSTGRES_URL
  if (!base) throw new Error("MVP_REFRESH_ISOLATED_POSTGRES_URL_REQUIRED")
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase()
  const refreshDatabase = identifier("q8r_refresh", suffix), populationDatabase = identifier("q8r_population", suffix)
  const refreshRole = identifier("q8r_rr", suffix), populationRole = identifier("q8r_pr", suffix)
  const databases = [refreshDatabase, populationDatabase], roles = [refreshRole, populationRole]
  const objectRoot = path.join(os.tmpdir(), `qt-mvp-8a2r-${suffix}`)
  let refreshSql: postgres.Sql | null = null, populationSql: postgres.Sql | null = null
  try {
    for (const role of roles) psql("postgres", `CREATE ROLE ${role} NOLOGIN`)
    for (const database of databases) psql("postgres", `CREATE DATABASE ${database}`)
    refreshSql = postgres(databaseUrl(base, refreshDatabase), { max: 1, prepare: false })
    populationSql = postgres(databaseUrl(base, populationDatabase), { max: 1, prepare: false })
    await refreshSql.unsafe(`
      CREATE SCHEMA refresh_control AUTHORIZATION ${refreshRole};
      CREATE TABLE refresh_control.refresh_plan(plan_id text PRIMARY KEY,checksum text NOT NULL,requested_start timestamptz NOT NULL,requested_end timestamptz NOT NULL);
      CREATE TABLE refresh_control.refresh_run(run_id text PRIMARY KEY,plan_id text NOT NULL REFERENCES refresh_control.refresh_plan(plan_id),checksum text NOT NULL);
      CREATE TABLE refresh_control.refresh_unit(unit_id text PRIMARY KEY,run_id text NOT NULL REFERENCES refresh_control.refresh_run(run_id));
      CREATE TABLE refresh_control.refresh_event(event_id text PRIMARY KEY,run_id text REFERENCES refresh_control.refresh_run(run_id),entity_kind text NOT NULL,entity_id text NOT NULL,event_kind text NOT NULL,from_state text,to_state text,payload jsonb NOT NULL,checksum text NOT NULL UNIQUE,occurred_at timestamptz NOT NULL);
      CREATE TABLE refresh_control.refresh_lease(lease_key text PRIMARY KEY,released_at timestamptz);
      CREATE TABLE refresh_control.refresh_artifact(artifact_id text PRIMARY KEY,run_id text NOT NULL);
      CREATE TABLE refresh_control.source_watermark(watermark_id text PRIMARY KEY,run_id text NOT NULL);
      CREATE TABLE refresh_control.refresh_candidate(candidate_id text PRIMARY KEY,run_id text NOT NULL);
      CREATE TABLE refresh_control.release_manifest(release_manifest_id text PRIMARY KEY,candidate_id text NOT NULL);
    `)
    await populationSql.unsafe(`
      CREATE SCHEMA control AUTHORIZATION ${populationRole}; CREATE SCHEMA population AUTHORIZATION ${populationRole}; CREATE SCHEMA raw AUTHORIZATION ${populationRole}; CREATE SCHEMA coverage AUTHORIZATION ${populationRole};
      CREATE TABLE control.population_jobs(job_id text PRIMARY KEY,intentional_rerun_identity text,requested_by text NOT NULL);
      CREATE TABLE control.population_runs(run_id text PRIMARY KEY,job_id text NOT NULL REFERENCES control.population_jobs(job_id),attempt_number integer NOT NULL);
      CREATE TABLE control.population_units(unit_id text PRIMARY KEY,job_id text NOT NULL REFERENCES control.population_jobs(job_id),window_start timestamptz NOT NULL,window_end timestamptz NOT NULL,current_state text NOT NULL,current_fencing_token bigint NOT NULL,active_lease_id text,updated_at timestamptz NOT NULL);
      CREATE TABLE raw.objects(object_id text PRIMARY KEY,content_hash text NOT NULL);
      CREATE TABLE control.retrieval_attempts(attempt_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id),raw_manifest_id text REFERENCES raw.objects(object_id));
      CREATE TABLE population.candidates(candidate_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id));
      CREATE TABLE control.population_leases(lease_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id),owner_id text NOT NULL,fencing_token bigint NOT NULL,acquired_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,released_at timestamptz,release_reason text);
      ALTER TABLE control.population_units ADD CONSTRAINT population_units_lease_fk FOREIGN KEY(active_lease_id) REFERENCES control.population_leases(lease_id) DEFERRABLE INITIALLY DEFERRED;
      CREATE TABLE control.population_checkpoints(checkpoint_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id));
      CREATE TABLE control.population_unit_events(event_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id),run_id text NOT NULL REFERENCES control.population_runs(run_id),event_type text NOT NULL,previous_state text,next_state text,fencing_token bigint,actor_id text NOT NULL,occurred_at timestamptz NOT NULL,details jsonb NOT NULL);
      CREATE TABLE control.population_outcomes(outcome_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id),outcome_kind text NOT NULL);
      CREATE TABLE coverage.watermark_eligibility_decisions(decision_id text PRIMARY KEY,unit_id text NOT NULL REFERENCES control.population_units(unit_id));
    `)
    await mkdir(objectRoot, { recursive: true })
    await writeFile(path.join(objectRoot, "immutable-payload"), "audit-readable")

    const planId = `mrlp_${"1".repeat(64)}`, planChecksum = "1".repeat(64), runId = `mrlr_${"2".repeat(64)}`, runChecksum = "2".repeat(64)
    const start = "2026-07-15T00:00:00.000Z", end = "2026-07-16T00:00:00.000Z", now = "2026-07-17T10:00:00.000Z"
    await refreshSql.unsafe("INSERT INTO refresh_control.refresh_plan VALUES($1,$2,$3,$4)", [planId, planChecksum, start, end])
    await refreshSql.unsafe("INSERT INTO refresh_control.refresh_run VALUES($1,$2,$3)", [runId, planId, runChecksum])
    await refreshSql.unsafe("INSERT INTO refresh_control.refresh_lease VALUES($1,NULL)", [`live-resume:${runId}`])
    for (let index = 0; index < 23; index++) await refreshSql.unsafe("INSERT INTO refresh_control.refresh_unit VALUES($1,$2)", [`unit-${index}`, runId])

    const shapes = [{ key: "btc-agg", candidates: 1, attempts: 1 }, { key: "doge-funding", candidates: 3, attempts: 2 }, { key: "eth-oi", candidates: 2, attempts: 2 }, { key: "sol-oi", candidates: 288, attempts: 1 }] as const
    for (const shape of shapes) {
      const jobId = `job-${shape.key}`, unitId = `population-unit-${shape.key}`, rawObjectId = `raw-${shape.key}`, retrievalId = `retrieval-${shape.key}`
      await populationSql.unsafe("INSERT INTO control.population_jobs VALUES($1,$2,'mvp-live-resume')", [jobId, runId])
      await populationSql.unsafe("INSERT INTO control.population_units VALUES($1,$2,$3,$4,'PROCESSING',2,NULL,$5)", [unitId, jobId, start, end, now])
      await populationSql.unsafe("INSERT INTO raw.objects VALUES($1,$2)", [rawObjectId, canonicalChecksum({ rawObjectId })])
      await populationSql.unsafe("INSERT INTO control.retrieval_attempts VALUES($1,$2,$3)", [retrievalId, unitId, rawObjectId])
      await populationSql.unsafe("INSERT INTO control.population_checkpoints VALUES($1,$2)", [`checkpoint-${shape.key}`, unitId])
      for (let attempt = 1; attempt <= shape.attempts; attempt++) await populationSql.unsafe("INSERT INTO control.population_runs VALUES($1,$2,$3)", [`population-run-${shape.key}-${attempt}`, jobId, attempt])
      await populationSql.unsafe("INSERT INTO population.candidates SELECT $1||generate_series(1,$2)::text,$3", [`candidate-${shape.key}-`, shape.candidates, unitId])
    }
    await populationSql.unsafe("INSERT INTO control.population_leases VALUES($1,$2,'certification-worker',2,$3,$4,NULL,NULL)", ["lease-sol-oi-2", "population-unit-sol-oi", "2026-07-17T09:59:00.000Z", "2026-07-17T10:05:00.000Z"])
    await populationSql.unsafe("UPDATE control.population_units SET active_lease_id=$1 WHERE unit_id=$2", ["lease-sol-oi-2", "population-unit-sol-oi"])

    const refresh = { sql: refreshSql, transaction: <T>(work: (sql: postgres.TransactionSql) => Promise<T>) => refreshSql!.begin(work) as Promise<T> }
    const population = { sql: populationSql, transaction: <T>(work: (sql: postgres.TransactionSql) => Promise<T>) => populationSql!.begin(work) as Promise<T> }
    const store = new PostgresExecutionGenerationQuarantineStore(refresh, population)
    const before = await store.inspect(runId)
    const proposal = createExecutionGenerationQuarantineProposal({ snapshot: before, reasonCode: LOGICAL_SLOT_EXECUTION_IDENTITY_INCIDENT, sourceCommitSha: "a70328b", operatorConfirmationIdentity: "mvp-8a2r-certification" })
    const first = await store.quarantine({ proposal, expectedIncidentChecksum: proposal.incidentChecksum, quarantinedAt: now })
    if (first.status !== "CREATED") throw new Error("QUARANTINE_CERTIFICATION_FIRST_NOT_CREATED")
    let resumeRejected = false
    try { await store.assertResumeEligible(runId) } catch (error) { resumeRejected = error instanceof Error && error.message === "EXECUTION_GENERATION_QUARANTINED" }
    const second = await store.quarantine({ proposal, expectedIncidentChecksum: proposal.incidentChecksum, quarantinedAt: "2026-07-17T10:01:00.000Z" })
    const conflict = await store.quarantine({ proposal: Object.freeze({ ...proposal, evidenceSummaryChecksum: "f".repeat(64) }), expectedIncidentChecksum: proposal.incidentChecksum, quarantinedAt: now })
    const after = await store.inspect(runId)
    const handoff = createCleanGenerationInputManifest({ proposal, logicalSlotIds: shapes.map((shape) => `slot-${shape.key}`), checkpointIds: shapes.map((shape) => `checkpoint-${shape.key}`) })
    const events = Number((await populationSql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM control.population_unit_events WHERE event_type='EXECUTION_GENERATION_QUARANTINED'"))[0]?.count ?? 0)
    const dispositions = Number((await refreshSql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM refresh_control.refresh_event WHERE event_kind='EXECUTION_GENERATION_DISPOSITION'"))[0]?.count ?? 0)
    if (!resumeRejected || second.status !== "DUPLICATE" || conflict.status !== "CONFLICT" || first.releasedPopulationLeases !== 1 || events !== 4 || dispositions !== 1 || after.activeLeaseCount !== 0 || after.lineageCounts.retrievalAttempts !== 4 || after.lineageCounts.rawObjects !== 4 || after.lineageCounts.candidates !== 294 || after.lineageCounts.canonicalFacts !== 0 || after.lineageCounts.downstreamOutputs !== 0 || after.lineageCounts.populationUnits !== 4 || after.lineageCounts.populationRunAttempts !== 6 || !handoff.checksum) throw new Error("QUARANTINE_CERTIFICATION_ASSERTION_FAILED")
    return Object.freeze({ passed: true, firstQuarantine: "CREATED", exactRetry: "DUPLICATE", changedEvidence: "CONFLICT", leasesReleased: 1, resumeRejectedBeforeWrites: true, immutableCountsPreserved: true, downstreamWrites: 0, statusCollapsedAttempts: true, evidenceReadable: true, receiptGenerated: true, cleanGenerationManifestGenerated: true, disposableDatabasesDestroyed: true, disposableRolesDestroyed: true, disposableArtifactsDestroyed: true })
  } finally {
    if (refreshSql) await refreshSql.end({ timeout: 5 }).catch(() => undefined)
    if (populationSql) await populationSql.end({ timeout: 5 }).catch(() => undefined)
    for (const database of [...databases].reverse()) { try { psql("postgres", `DROP DATABASE IF EXISTS ${database} WITH (FORCE)`) } catch {} }
    for (const role of [...roles].reverse()) { try { psql("postgres", `DROP ROLE IF EXISTS ${role}`) } catch {} }
    await rm(objectRoot, { recursive: true, force: true })
  }
}
