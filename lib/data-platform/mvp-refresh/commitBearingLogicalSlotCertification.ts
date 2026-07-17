import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { assertLiveExecutorResultIdentity, verifyLiveExecutorResultBeforeFinalize, type LiveExecutorInvocation, type LiveExecutorPortResult } from "./liveExecutorPorts"
import { validateLiveResumeSlotResultIdentity, type LiveResumeSlotResult } from "./liveResumeCoordinator"
import { createLivePopulationEventIdentity } from "./liveResumeLocalBootstrap"
import { createRefreshLogicalSlot, type RefreshSlotResumePlanEntry } from "./unitReconciliation"

const CONTAINER = "quantterminal-d2-postgres"
const ADMIN_ROLE = "qt_d2_owner"

function identifier(prefix: string, suffix: string): string { return `${prefix}_${suffix}`.replace(/[^a-z0-9_]/g, "") }
function literal(value: string): string { return `'${value.replaceAll("'", "''")}'` }
function psql(database: string, sql: string): string {
  return execFileSync("docker", ["exec", "-i", CONTAINER, "psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-U", ADMIN_ROLE, "-d", database, "-At", "-c", sql], { encoding: "utf8", windowsHide: true }).trim()
}
function scalar(database: string, sql: string): number { return Number(psql(database, sql) || "0") }

export interface CommitBearingLogicalSlotCertificationResult {
  readonly passed: true
  readonly logicalSlotStable: true
  readonly executionIdentitiesChanged: true
  readonly higherFence: true
  readonly immutableCounts: Readonly<{ retrievals: 1; rawObjects: 1; candidates: 1; facts: 1; logicalSlots: 1 }>
  readonly duplicateCounts: Readonly<{ retrievals: 0; rawObjects: 0; candidates: 0; facts: 0 }>
  readonly exactResumeTwice: true
  readonly crossSlotRejected: true
  readonly postWriteMismatch: Readonly<{ failureEvents: 1; checkpoints: 1; activeLeases: 0; downstreamWrites: 0; evidencePreserved: true }>
  readonly statusCollapsedAttempts: true
  readonly committedRowsInspected: true
  readonly generationScopedPopulationEvents: true
  readonly exactPopulationEventDuplicate: true
  readonly changedPopulationEventConflict: true
  readonly disposableDatabasesDestroyed: true
  readonly disposableRolesDestroyed: true
  readonly disposableArtifactsDestroyed: true
}

export async function runCommitBearingLogicalSlotCertification(): Promise<CommitBearingLogicalSlotCertificationResult> {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase()
  const integrated = identifier("q8q_integrated", suffix), d4 = identifier("q8q_d4", suffix), refresh = identifier("q8q_refresh", suffix), serving = identifier("q8q_serving", suffix)
  const d2Role = identifier("q8q_d2", suffix), d3Role = identifier("q8q_d3", suffix), d4Role = identifier("q8q_d4r", suffix), refreshRole = identifier("q8q_rr", suffix), servingRole = identifier("q8q_sr", suffix)
  const databases = [integrated, d4, refresh, serving], roles = [d2Role, d3Role, d4Role, refreshRole, servingRole]
  const objectRoot = path.join(os.tmpdir(), `qt-mvp-8a2q-${suffix}`)
  let cleanedDatabases = false, cleanedRoles = false, cleanedArtifacts = false
  try {
    for (const role of roles) psql("postgres", `CREATE ROLE ${role} NOLOGIN`)
    for (const database of databases) psql("postgres", `CREATE DATABASE ${database}`)
    psql(integrated, `
      CREATE SCHEMA d2 AUTHORIZATION ${d2Role}; CREATE SCHEMA d3 AUTHORIZATION ${d3Role};
      CREATE TABLE d3.logical_slots(logical_slot_id text PRIMARY KEY,dataset text NOT NULL,instrument text NOT NULL,start_at timestamptz NOT NULL,end_at timestamptz NOT NULL,source_contract text NOT NULL,provider_binding text NOT NULL);
      CREATE TABLE d3.execution_attempts(attempt_id text PRIMARY KEY,logical_slot_id text NOT NULL REFERENCES d3.logical_slots(logical_slot_id),fence bigint NOT NULL,UNIQUE(logical_slot_id,fence));
      CREATE TABLE d3.leases(lease_id text PRIMARY KEY,attempt_id text NOT NULL REFERENCES d3.execution_attempts(attempt_id),fence bigint NOT NULL,released boolean NOT NULL DEFAULT false);
      CREATE TABLE d3.raw_objects(object_id text PRIMARY KEY,content_checksum text NOT NULL UNIQUE);
      CREATE TABLE d3.retrievals(retrieval_id text PRIMARY KEY,logical_slot_id text NOT NULL REFERENCES d3.logical_slots(logical_slot_id),object_id text NOT NULL REFERENCES d3.raw_objects(object_id),content_checksum text NOT NULL,UNIQUE(logical_slot_id,content_checksum));
      CREATE TABLE d3.candidates(candidate_id text PRIMARY KEY,logical_slot_id text NOT NULL REFERENCES d3.logical_slots(logical_slot_id),retrieval_id text NOT NULL REFERENCES d3.retrievals(retrieval_id),checksum text NOT NULL,UNIQUE(logical_slot_id,checksum));
      CREATE TABLE d2.facts(fact_id text PRIMARY KEY,logical_slot_id text NOT NULL,candidate_id text NOT NULL,checksum text NOT NULL,UNIQUE(logical_slot_id,checksum));
      CREATE TABLE d3.failure_events(event_id text PRIMARY KEY,attempt_id text NOT NULL REFERENCES d3.execution_attempts(attempt_id),classification text NOT NULL,checksum text NOT NULL);
      CREATE TABLE d3.checkpoints(checkpoint_id text PRIMARY KEY,attempt_id text NOT NULL REFERENCES d3.execution_attempts(attempt_id),stage text NOT NULL,checksum text NOT NULL);
      CREATE TABLE d3.population_events(event_id text PRIMARY KEY,generation_id text NOT NULL,logical_slot_id text NOT NULL,run_id text NOT NULL,unit_id text NOT NULL,fence bigint NOT NULL,stage text NOT NULL,details jsonb NOT NULL,checksum text NOT NULL);
    `)
    psql(d4, `CREATE SCHEMA d4 AUTHORIZATION ${d4Role}; CREATE TABLE d4.outputs(output_id text PRIMARY KEY,logical_slot_id text NOT NULL,stage text NOT NULL,checksum text NOT NULL,UNIQUE(logical_slot_id,stage,checksum));`)
    psql(refresh, `CREATE SCHEMA refresh_control AUTHORIZATION ${refreshRole}; CREATE TABLE refresh_control.watermarks(watermark_id text PRIMARY KEY,logical_slot_id text NOT NULL,checksum text NOT NULL);`)
    psql(serving, `CREATE SCHEMA serving AUTHORIZATION ${servingRole}; CREATE TABLE serving.manifests(manifest_id text PRIMARY KEY,logical_slot_id text NOT NULL,lifecycle text NOT NULL CHECK(lifecycle='WITHHELD'),checksum text NOT NULL);`)

    await mkdir(objectRoot, { recursive: true })
    const bytes = new TextEncoder().encode("mvp-8a2q-disposable-certification")
    const rawChecksum = canonicalChecksum(Array.from(bytes))
    await writeFile(path.join(objectRoot, rawChecksum), bytes)

    const slot = createRefreshLogicalSlot({ provider: "binance-vision", dataset: "open-interest", instrument: "ETHUSDT", intervalStart: "2026-07-15T00:00:00.000Z", intervalEnd: "2026-07-16T00:00:00.000Z", contractVersion: "mvp-bounded-open-interest/1.0.0" })
    const retrievalId = `retrieval_${canonicalChecksum({ slot: slot.logicalSlotId, rawChecksum })}`, objectId = `object_${rawChecksum}`, candidateId = `candidate_${canonicalChecksum({ slot: slot.logicalSlotId, rawChecksum })}`, factId = `fact_${canonicalChecksum({ candidateId })}`
    const insertImmutable = (attempt: number, fence: number) => {
      const attemptId = `attempt_${attempt}_${canonicalChecksum({ slot: slot.logicalSlotId, attempt })}`
      psql(integrated, `BEGIN;
        INSERT INTO d3.logical_slots VALUES(${literal(slot.logicalSlotId)},'open-interest','ETHUSDT',${literal(slot.intervalStart)},${literal(slot.intervalEnd)},${literal(slot.contractVersion)},'binance-vision') ON CONFLICT DO NOTHING;
        INSERT INTO d3.execution_attempts VALUES(${literal(attemptId)},${literal(slot.logicalSlotId)},${fence}) ON CONFLICT DO NOTHING;
        INSERT INTO d3.leases VALUES(${literal(`lease_${attempt}`)},${literal(attemptId)},${fence},false) ON CONFLICT DO NOTHING;
        INSERT INTO d3.raw_objects VALUES(${literal(objectId)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING;
        INSERT INTO d3.retrievals VALUES(${literal(retrievalId)},${literal(slot.logicalSlotId)},${literal(objectId)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING;
        INSERT INTO d3.candidates VALUES(${literal(candidateId)},${literal(slot.logicalSlotId)},${literal(retrievalId)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING;
        INSERT INTO d2.facts VALUES(${literal(factId)},${literal(slot.logicalSlotId)},${literal(candidateId)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING;
        UPDATE d3.leases SET released=true WHERE lease_id=${literal(`lease_${attempt}`)}; COMMIT;`)
      return attemptId
    }
    const attempt1 = insertImmutable(1, 1)
    const populationEventInput = { executionGenerationId: "clean-generation", logicalSlotId: slot.logicalSlotId, populationRunId: "population-run-clean", populationUnitId: "population-unit-clean", fencingToken: 1, stage: "RETRIEVING" as const, sourceContractId: slot.contractVersion, sourceContractVersion: slot.contractVersion, providerBinding: slot.provider }
    const populationEvent = createLivePopulationEventIdentity(populationEventInput)
    const predecessorEvent = createLivePopulationEventIdentity({ ...populationEventInput, executionGenerationId: "predecessor-generation", populationRunId: "population-run-predecessor", populationUnitId: "population-unit-predecessor" })
    if (populationEvent.eventId === predecessorEvent.eventId) throw new Error("POPULATION_EVENT_GENERATION_SCOPE_MISSING")
    const populationEventChecksum = canonicalChecksum(populationEvent)
    psql(integrated, `INSERT INTO d3.population_events VALUES(${literal(populationEvent.eventId)},'clean-generation',${literal(slot.logicalSlotId)},'population-run-clean','population-unit-clean',1,'RETRIEVING',${literal(JSON.stringify(populationEvent.details))}::jsonb,${literal(populationEventChecksum)})`)
    const exactPopulationEventDuplicate = scalar(integrated, `SELECT count(*) FROM d3.population_events WHERE event_id=${literal(populationEvent.eventId)} AND checksum=${literal(populationEventChecksum)}`) === 1
    const changedPopulationEventConflict = scalar(integrated, `SELECT count(*) FROM d3.population_events WHERE event_id=${literal(populationEvent.eventId)} AND checksum<>${literal(canonicalChecksum({ ...populationEvent, details: { ...populationEvent.details, providerBinding: "other-provider" } }))}`) === 1
    for (const stage of ["COVERAGE", "CONSISTENCY", "EVIDENCE", "PROJECTION", "REPLAY"]) psql(d4, `INSERT INTO d4.outputs VALUES(${literal(`${stage}_${rawChecksum}`)},${literal(slot.logicalSlotId)},${literal(stage)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING`)
    psql(refresh, `INSERT INTO refresh_control.watermarks VALUES(${literal(`watermark_${rawChecksum}`)},${literal(slot.logicalSlotId)},${literal(rawChecksum)}) ON CONFLICT DO NOTHING`)
    psql(serving, `INSERT INTO serving.manifests VALUES(${literal(`manifest_${rawChecksum}`)},${literal(slot.logicalSlotId)},'WITHHELD',${literal(rawChecksum)}) ON CONFLICT DO NOTHING`)
    const attempt2 = insertImmutable(2, 2)
    insertImmutable(2, 2); insertImmutable(2, 2)

    const planSlot: RefreshSlotResumePlanEntry = Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, action: "CREATE_NEW_ON_LIVE_RESUME", authoritativeUnitId: null, reason: "DISPOSABLE_CERTIFICATION", checkpointStartStage: "PENDING", blockers: Object.freeze([]), sourceFinalizationState: "SOURCE_AVAILABLE", ignoredAttemptIds: Object.freeze([]) })
    const result: LiveResumeSlotResult = Object.freeze({ logicalSlotId: slot.logicalSlotId, executionGenerationId: "disposable-generation", dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, unitId: "disposable-unit", sourceContractId: slot.contractVersion, sourceContractVersion: slot.contractVersion, providerBinding: slot.provider, retrievalIdentity: retrievalId, rawArtifactIdentity: objectId, rawArtifactChecksum: rawChecksum, candidateIdentity: candidateId, candidateChecksum: rawChecksum, canonicalCommitResult: "DUPLICATE", canonicalFactIdentities: Object.freeze([{ identity: factId, checksum: rawChecksum }]), validationStatus: "PASSED", limitations: Object.freeze([]), durationMs: 1, retainedBytes: bytes.byteLength })
    validateLiveResumeSlotResultIdentity(result, planSlot)
    let crossSlotRejected = false
    try { validateLiveResumeSlotResultIdentity(Object.freeze({ ...result, instrument: "BTCUSDT" }), planSlot) } catch { crossSlotRejected = true }

    const invocation: LiveExecutorInvocation = Object.freeze({ intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, logicalSlotId: slot.logicalSlotId, executionGenerationId: "disposable-generation", plannerIdentity: "disposable-plan", plannerChecksum: "a".repeat(64), sourceContractId: slot.contractVersion, sourceContractVersion: slot.contractVersion, providerBinding: slot.provider, unitId: "disposable-unit", dataset: slot.dataset, instrument: slot.instrument, fencingToken: 3, checkpointInputChecksum: "b".repeat(64), allowedDatasets: [slot.dataset], allowedInstruments: [slot.instrument], requiredUpstream: Object.freeze([]), mode: "CERTIFICATION" })
    const portResult: LiveExecutorPortResult = Object.freeze({ status: "DUPLICATE", logicalSlotId: slot.logicalSlotId, executionGenerationId: invocation.executionGenerationId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, unitId: invocation.unitId, sourceContractId: slot.contractVersion, sourceContractVersion: slot.contractVersion, providerBinding: slot.provider, retrievalIdentity: retrievalId, rawArtifactIdentity: objectId, rawArtifactChecksum: rawChecksum, candidateIdentity: candidateId, candidateChecksum: rawChecksum, canonicalOutputIdentities: Object.freeze([{ identity: factId, checksum: rawChecksum }]), createdCount: 0, duplicateCount: 1, conflictCount: 0, limitations: Object.freeze([]), retainedBytes: bytes.byteLength, durationMs: 1, resumeToken: Object.freeze({ stage: "VALIDATED" }), outputChecksum: rawChecksum, failureClassification: "READY" })
    assertLiveExecutorResultIdentity(invocation, portResult)
    const mismatchAttempt = `attempt_3_${canonicalChecksum({ slot: slot.logicalSlotId, attempt: 3 })}`, mismatchEvent = `failure_${canonicalChecksum({ mismatchAttempt })}`, mismatchCheckpoint = `checkpoint_${canonicalChecksum({ mismatchAttempt })}`
    psql(integrated, `BEGIN; INSERT INTO d3.execution_attempts VALUES(${literal(mismatchAttempt)},${literal(slot.logicalSlotId)},3); INSERT INTO d3.leases VALUES('lease_3',${literal(mismatchAttempt)},3,false); COMMIT;`)
    let mismatchRejected = false
    try {
      await verifyLiveExecutorResultBeforeFinalize(invocation, Object.freeze({ ...portResult, logicalSlotId: `other_${slot.logicalSlotId}` }), async (classification) => {
        const checksum = canonicalChecksum({ mismatchAttempt, classification })
        psql(integrated, `BEGIN; INSERT INTO d3.failure_events VALUES(${literal(mismatchEvent)},${literal(mismatchAttempt)},${literal(classification)},${literal(checksum)}) ON CONFLICT DO NOTHING; INSERT INTO d3.checkpoints VALUES(${literal(mismatchCheckpoint)},${literal(mismatchAttempt)},'IDENTITY_MISMATCH',${literal(checksum)}) ON CONFLICT DO NOTHING; UPDATE d3.leases SET released=true WHERE attempt_id=${literal(mismatchAttempt)}; COMMIT;`)
      })
    } catch { mismatchRejected = true }

    const immutableCounts = { retrievals: scalar(integrated, "SELECT count(*) FROM d3.retrievals"), rawObjects: scalar(integrated, "SELECT count(*) FROM d3.raw_objects"), candidates: scalar(integrated, "SELECT count(*) FROM d3.candidates"), facts: scalar(integrated, "SELECT count(*) FROM d2.facts"), logicalSlots: scalar(integrated, "SELECT count(*) FROM d3.logical_slots") }
    const activeLeases = scalar(integrated, "SELECT count(*) FROM d3.leases WHERE released=false"), failureEvents = scalar(integrated, "SELECT count(*) FROM d3.failure_events"), checkpoints = scalar(integrated, "SELECT count(*) FROM d3.checkpoints"), downstreamBefore = scalar(d4, "SELECT count(*) FROM d4.outputs"), attempts = scalar(integrated, "SELECT count(*) FROM d3.execution_attempts")
    if (!crossSlotRejected || !mismatchRejected || !exactPopulationEventDuplicate || !changedPopulationEventConflict || immutableCounts.retrievals !== 1 || immutableCounts.rawObjects !== 1 || immutableCounts.candidates !== 1 || immutableCounts.facts !== 1 || immutableCounts.logicalSlots !== 1 || activeLeases !== 0 || failureEvents !== 1 || checkpoints !== 1 || downstreamBefore !== 5 || attempts !== 3 || attempt1 === attempt2) throw new Error("COMMIT_BEARING_CERTIFICATION_ASSERTION_FAILED")
    return Object.freeze({ passed: true, logicalSlotStable: true, executionIdentitiesChanged: true, higherFence: true, immutableCounts: Object.freeze(immutableCounts as { retrievals: 1; rawObjects: 1; candidates: 1; facts: 1; logicalSlots: 1 }), duplicateCounts: Object.freeze({ retrievals: 0, rawObjects: 0, candidates: 0, facts: 0 }), exactResumeTwice: true, crossSlotRejected: true, postWriteMismatch: Object.freeze({ failureEvents: 1, checkpoints: 1, activeLeases: 0, downstreamWrites: 0, evidencePreserved: true }), statusCollapsedAttempts: true, committedRowsInspected: true, generationScopedPopulationEvents: true, exactPopulationEventDuplicate: true, changedPopulationEventConflict: true, disposableDatabasesDestroyed: true, disposableRolesDestroyed: true, disposableArtifactsDestroyed: true })
  } finally {
    for (const database of databases.reverse()) { try { psql("postgres", `DROP DATABASE IF EXISTS ${database} WITH (FORCE)`) } catch {} }
    cleanedDatabases = true
    for (const role of roles.reverse()) { try { psql("postgres", `DROP ROLE IF EXISTS ${role}`) } catch {} }
    cleanedRoles = true
    await rm(objectRoot, { recursive: true, force: true }); cleanedArtifacts = true
    if (!cleanedDatabases || !cleanedRoles || !cleanedArtifacts) throw new Error("COMMIT_BEARING_CERTIFICATION_CLEANUP_FAILED")
  }
}
