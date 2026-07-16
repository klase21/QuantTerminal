import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"
import type { MvpRefreshPostgresClient } from "./client"
import { isLegalRunTransition, isLegalUnitTransition, type RefreshPlan, type RefreshRunState, type RefreshUnitState } from "./contracts"
import type { RefreshUnitAttemptAudit } from "./unitReconciliation"

export interface RefreshUnitInput {
  readonly unitId: string
  readonly runId: string
  readonly instrument: string
  readonly datasetId: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly checksum: string
}

function jsonRecord(value: Record<string, unknown> | string | null): Readonly<Record<string, unknown>> {
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("REFRESH_UNIT_CHECKPOINT_INVALID")
    return Object.freeze(parsed as Record<string, unknown>)
  }
  return Object.freeze(value ?? {})
}

export class MvpRefreshStore {
  constructor(private readonly client: MvpRefreshPostgresClient) {}

  async putPolicy(policy: object & { readonly policyId: string; readonly policyVersion: string; readonly checksum: string }): Promise<"INSERTED" | "DUPLICATE"> {
    const rows = await this.client.sql.unsafe<Array<{ checksum: string }>>("SELECT checksum FROM refresh_control.refresh_policy WHERE policy_id=$1", [policy.policyId])
    if (rows[0]) {
      if (rows[0].checksum !== policy.checksum) throw new Error("REFRESH_POLICY_IMMUTABLE_CONFLICT")
      return "DUPLICATE"
    }
    await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_policy(policy_id,policy_version,policy,checksum,created_at) VALUES($1,$2,$3::jsonb,$4,now())", [policy.policyId, policy.policyVersion, JSON.stringify(policy), policy.checksum])
    return "INSERTED"
  }

  async putPlan(plan: RefreshPlan): Promise<"INSERTED" | "DUPLICATE"> {
    const rows = await this.client.sql.unsafe<Array<{ checksum: string }>>("SELECT checksum FROM refresh_control.refresh_plan WHERE plan_id=$1", [plan.planId])
    if (rows[0]) {
      if (rows[0].checksum !== plan.checksum) throw new Error("REFRESH_PLAN_IMMUTABLE_CONFLICT")
      return "DUPLICATE"
    }
    await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_plan(plan_id,policy_id,active_corpus_id,active_serving_checksum,requested_start,requested_end,state,plan,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now())", [plan.planId, plan.policyId, plan.activeCorpusId, plan.activeServingChecksum, plan.window.requestedStart, plan.window.requestedEnd, plan.state, JSON.stringify(plan), plan.checksum])
    return "INSERTED"
  }

  async putRun(runId: string, planId: string, checksum: string): Promise<"INSERTED" | "DUPLICATE"> {
    const rows = await this.client.sql.unsafe<Array<{ checksum: string }>>("SELECT checksum FROM refresh_control.refresh_run WHERE run_id=$1", [runId])
    if (rows[0]) {
      if (rows[0].checksum !== checksum) throw new Error("REFRESH_RUN_IMMUTABLE_CONFLICT")
      return "DUPLICATE"
    }
    await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_run(run_id,plan_id,state,checksum,created_at,updated_at) VALUES($1,$2,'PLANNED',$3,now(),now())", [runId, planId, checksum])
    return "INSERTED"
  }

  async putUnits(units: readonly RefreshUnitInput[]): Promise<number> {
    let inserted = 0
    for (const unit of units) {
      const result = await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_unit(unit_id,run_id,instrument,dataset_id,interval_start,interval_end,state,checksum,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,now(),now()) ON CONFLICT (unit_id) DO NOTHING", [unit.unitId, unit.runId, unit.instrument, unit.datasetId, unit.intervalStart, unit.intervalEnd, unit.checksum])
      inserted += result.count
    }
    return inserted
  }

  async auditUnitsForWindow(intervalStart: string, intervalEnd: string): Promise<readonly RefreshUnitAttemptAudit[]> {
    const units = await this.client.sql.unsafe<Array<{ unit_id: string; run_id: string; instrument: RefreshUnitAttemptAudit["instrument"]; dataset_id: RefreshUnitAttemptAudit["dataset"]; interval_start: string; interval_end: string; state: RefreshUnitState; checksum: string; checkpoint: Record<string, unknown> | string }>>("SELECT unit_id,run_id,instrument,dataset_id,interval_start::text,interval_end::text,state,checksum,checkpoint FROM refresh_control.refresh_unit WHERE interval_start=$1 AND interval_end=$2 ORDER BY created_at,unit_id", [intervalStart, intervalEnd])
    if (!units.length) return Object.freeze([])
    const unitIds = units.map((unit) => unit.unit_id)
    const events = await this.client.sql.unsafe<Array<{ entity_id: string; event_kind: string; from_state: string | null; to_state: string | null; occurred_at: string }>>("SELECT entity_id,event_kind,from_state,to_state,occurred_at::text FROM refresh_control.refresh_event WHERE entity_kind='refresh_unit' AND entity_id=ANY($1::text[]) ORDER BY occurred_at,event_id", [unitIds])
    const artifacts = await this.client.sql.unsafe<Array<{ unit_id: string; artifact_id: string; content_checksum: string; retrieval_identity: string | null; contract_version: string | null }>>("SELECT unit_id,artifact_id,content_checksum,lineage->>'retrievalIdentity' retrieval_identity,lineage->>'sourceContractVersion' contract_version FROM refresh_control.refresh_artifact WHERE unit_id=ANY($1::text[]) ORDER BY created_at,artifact_id", [unitIds])
    const leases = await this.client.sql.unsafe<Array<{ lease_key: string; fencing_token: string; active: boolean; released: boolean }>>("SELECT lease_key,fencing_token::text,expires_at>now() AND released_at IS NULL active,released_at IS NOT NULL released FROM refresh_control.refresh_lease")
    return Object.freeze(units.map((unit) => {
      const lease = leases.find((value) => value.lease_key.includes(unit.unit_id))
      return Object.freeze({
        unitId: unit.unit_id,
        runId: unit.run_id,
        instrument: unit.instrument,
        dataset: unit.dataset_id,
        intervalStart: new Date(unit.interval_start).toISOString(),
        intervalEnd: new Date(unit.interval_end).toISOString(),
        state: unit.state,
        unitChecksum: unit.checksum,
        checkpoint: jsonRecord(unit.checkpoint),
        artifacts: Object.freeze(artifacts.filter((value) => value.unit_id === unit.unit_id).map((value) => Object.freeze({ artifactId: value.artifact_id, checksum: value.content_checksum, retrievalIdentity: value.retrieval_identity, contractVersion: value.contract_version }))),
        events: Object.freeze(events.filter((value) => value.entity_id === unit.unit_id).map((value) => Object.freeze({ eventKind: value.event_kind, fromState: value.from_state, toState: value.to_state, occurredAt: new Date(value.occurred_at).toISOString() }))),
        lease: lease ? Object.freeze({ fencingToken: Number(lease.fencing_token), active: lease.active, released: lease.released }) : null,
      })
    }))
  }

  async transitionRun(runId: string, to: RefreshRunState, blockerCodes: readonly string[] = []): Promise<void> {
    await this.client.transaction(async (sql) => {
      const rows = await sql.unsafe<Array<{ state: RefreshRunState }>>("SELECT state FROM refresh_control.refresh_run WHERE run_id=$1 FOR UPDATE", [runId])
      const from = rows[0]?.state
      if (!from || !isLegalRunTransition(from, to)) throw new Error("REFRESH_RUN_TRANSITION_INVALID")
      await sql.unsafe("UPDATE refresh_control.refresh_run SET state=$2,blocker_codes=$3,updated_at=now() WHERE run_id=$1", [runId, to, blockerCodes])
      await this.appendEventSql(sql, runId, "refresh_run", runId, "STATE_TRANSITION", from, to, { blockerCodes })
    })
  }

  async transitionUnit(unitId: string, to: RefreshUnitState, blockerCodes: readonly string[] = []): Promise<void> {
    await this.client.transaction(async (sql) => {
      const rows = await sql.unsafe<Array<{ run_id: string; state: RefreshUnitState }>>("SELECT run_id,state FROM refresh_control.refresh_unit WHERE unit_id=$1 FOR UPDATE", [unitId])
      const row = rows[0]
      if (!row || !isLegalUnitTransition(row.state, to)) throw new Error("REFRESH_UNIT_TRANSITION_INVALID")
      await sql.unsafe("UPDATE refresh_control.refresh_unit SET state=$2,blocker_codes=$3,updated_at=now() WHERE unit_id=$1", [unitId, to, blockerCodes])
      await this.appendEventSql(sql, row.run_id, "refresh_unit", unitId, "STATE_TRANSITION", row.state, to, { blockerCodes })
    })
  }

  async writeCheckpoint(unitId: string, checkpoint: object): Promise<void> {
    await this.client.sql.unsafe("UPDATE refresh_control.refresh_unit SET checkpoint=$2::jsonb,updated_at=now() WHERE unit_id=$1", [unitId, JSON.stringify(checkpoint)])
  }

  async readStageCheckpoint(unitId: string, stage: string): Promise<Record<string, unknown> | null> {
    const rows = await this.client.sql.unsafe<Array<{ checkpoint: Record<string, unknown> }>>("SELECT checkpoint FROM refresh_control.refresh_unit WHERE unit_id=$1", [unitId])
    const downstream = rows[0]?.checkpoint?.downstream
    if (!downstream || typeof downstream !== "object" || Array.isArray(downstream)) return null
    const value = (downstream as Record<string, unknown>)[stage]
    return value && typeof value === "object" && !Array.isArray(value) ? Object.freeze(value as Record<string, unknown>) : null
  }

  async writeStageCheckpoint(input: { readonly unitId: string; readonly stage: string; readonly checkpoint: object & { readonly checksum: string }; readonly leaseKey: string; readonly ownerId: string; readonly fencingToken: number }): Promise<"CREATED" | "DUPLICATE"> {
    return this.client.transaction(async (sql) => {
      const fence = await sql.unsafe<Array<{ valid: boolean }>>("SELECT owner_id=$2 AND fencing_token=$3 AND expires_at>now() AND released_at IS NULL valid FROM refresh_control.refresh_lease WHERE lease_key=$1 FOR UPDATE", [input.leaseKey, input.ownerId, input.fencingToken])
      if (!fence[0]?.valid) throw new Error("REFRESH_LEASE_FENCE_LOST")
      const rows = await sql.unsafe<Array<{ checkpoint: Record<string, unknown> }>>("SELECT checkpoint FROM refresh_control.refresh_unit WHERE unit_id=$1 FOR UPDATE", [input.unitId])
      if (!rows[0]) throw new Error("REFRESH_UNIT_MISSING")
      const current = rows[0].checkpoint ?? {}, downstream = current.downstream && typeof current.downstream === "object" && !Array.isArray(current.downstream) ? current.downstream as Record<string, unknown> : {}, existing = downstream[input.stage]
      if (existing) {
        const storedChecksum = typeof existing === "object" && !Array.isArray(existing) ? String((existing as Record<string, unknown>).checksum ?? "") : ""
        if (storedChecksum !== input.checkpoint.checksum) throw new Error("REFRESH_CHECKPOINT_IMMUTABLE_CONFLICT")
        return "DUPLICATE"
      }
      const next = { ...current, downstream: { ...downstream, [input.stage]: input.checkpoint } }
      await sql.unsafe("UPDATE refresh_control.refresh_unit SET checkpoint=$2::text::jsonb,updated_at=now() WHERE unit_id=$1", [input.unitId, JSON.stringify(next)])
      return "CREATED"
    })
  }

  async recordArtifact(input: { readonly unitId: string; readonly artifactId: string; readonly artifactKind: string; readonly contentChecksum: string; readonly byteCount: number; readonly lineage: object }): Promise<"INSERTED" | "DUPLICATE"> {
    const units = await this.client.sql.unsafe<Array<{ run_id: string }>>("SELECT run_id FROM refresh_control.refresh_unit WHERE unit_id=$1", [input.unitId])
    if (!units[0]) throw new Error("REFRESH_UNIT_MISSING")
    const result = await this.client.sql.unsafe("INSERT INTO refresh_control.refresh_artifact(artifact_id,run_id,unit_id,artifact_kind,content_checksum,byte_count,lineage,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,now()) ON CONFLICT (artifact_id) DO NOTHING", [input.artifactId, units[0].run_id, input.unitId, input.artifactKind, input.contentChecksum, input.byteCount, JSON.stringify(input.lineage)])
    if (result.count === 0) {
      const rows = await this.client.sql.unsafe<Array<{ content_checksum: string; byte_count: string }>>("SELECT content_checksum,byte_count::text FROM refresh_control.refresh_artifact WHERE artifact_id=$1", [input.artifactId])
      if (rows[0]?.content_checksum !== input.contentChecksum || Number(rows[0]?.byte_count) !== input.byteCount) throw new Error("REFRESH_ARTIFACT_IMMUTABLE_CONFLICT")
      return "DUPLICATE"
    }
    return "INSERTED"
  }

  async recordFundingObservation(input: { readonly unitId: string; readonly provider: string; readonly instrument: string; readonly intervalStart: string; readonly intervalEnd: string; readonly observedThrough: string | null; readonly finalizedThrough: string; readonly sourceChecksum: string; readonly eventCount: number; readonly coverageState: "COMPLETE"; readonly recordedAt: string }): Promise<void> {
    const units = await this.client.sql.unsafe<Array<{ run_id: string }>>("SELECT run_id FROM refresh_control.refresh_unit WHERE unit_id=$1", [input.unitId])
    const runId = units[0]?.run_id
    if (!runId) throw new Error("REFRESH_UNIT_MISSING")
    const sourceId = `${input.provider}:${input.instrument}`
    const observation = { requestedStart: input.intervalStart, requestedEnd: input.intervalEnd, observedThrough: input.observedThrough, finalizedThrough: input.finalizedThrough, lastProviderNativeEventTimestamp: input.observedThrough, availabilityState: "AVAILABLE", coverageState: input.coverageState, checksumState: "VERIFIED", eventCount: input.eventCount, limitations: [] }
    const observationChecksum = canonicalChecksum({ runId, datasetId: "funding", sourceId, observation })
    const observationId = `mrao_${observationChecksum}`
    await this.client.sql.unsafe("INSERT INTO refresh_control.source_availability_observation(observation_id,run_id,dataset_id,source_id,interval_start,interval_end,state,reason_codes,observation,checksum,observed_at) VALUES($1,$2,'funding',$3,$4,$5,'AVAILABLE','{}',$6::jsonb,$7,$8) ON CONFLICT (observation_id) DO NOTHING", [observationId, runId, sourceId, input.intervalStart, input.intervalEnd, JSON.stringify(observation), observationChecksum, input.recordedAt])
    const watermarkBasis = { runId, datasetId: "funding", sourceId, mandatory: true, observedThrough: input.finalizedThrough, state: "AVAILABLE", reasonCodes: [], sourceChecksum: input.sourceChecksum }
    const watermarkChecksum = canonicalChecksum(watermarkBasis)
    const watermarkId = `mrw_${watermarkChecksum}`
    await this.client.sql.unsafe("INSERT INTO refresh_control.source_watermark(watermark_id,run_id,dataset_id,source_id,mandatory,observed_through,state,reason_codes,source_checksum,checksum,observed_at) VALUES($1,$2,'funding',$3,true,$4,'AVAILABLE','{}',$5,$6,$7) ON CONFLICT (run_id,dataset_id,source_id) DO NOTHING", [watermarkId, runId, sourceId, input.finalizedThrough, input.sourceChecksum, watermarkChecksum, input.recordedAt])
  }

  async appendEvent(runId: string | null, entityKind: string, entityId: string, eventKind: string, fromState: string | null, toState: string | null, payload: object): Promise<string> {
    return this.appendEventSql(this.client.sql, runId, entityKind, entityId, eventKind, fromState, toState, payload)
  }

  private async appendEventSql(sql: postgres.Sql | postgres.TransactionSql, runId: string | null, entityKind: string, entityId: string, eventKind: string, fromState: string | null, toState: string | null, payload: object): Promise<string> {
    const occurredAt = new Date().toISOString()
    const checksum = canonicalChecksum({ runId, entityKind, entityId, eventKind, fromState, toState, payload, occurredAt })
    const eventId = `mre_${checksum}`
    await sql.unsafe("INSERT INTO refresh_control.refresh_event(event_id,run_id,entity_kind,entity_id,event_kind,from_state,to_state,payload,checksum,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) ON CONFLICT (event_id) DO NOTHING", [eventId, runId, entityKind, entityId, eventKind, fromState, toState, JSON.stringify(payload), checksum, occurredAt])
    return eventId
  }

  async acquireLease(leaseKey: string, ownerId: string, leaseSeconds: number): Promise<{ readonly acquired: boolean; readonly fencingToken: number }> {
    return this.client.transaction(async (sql) => {
      const rows = await sql.unsafe<Array<{ owner_id: string; fencing_token: string; expires_at: string }>>("SELECT owner_id,fencing_token::text,expires_at::text FROM refresh_control.refresh_lease WHERE lease_key=$1 FOR UPDATE", [leaseKey])
      const row = rows[0]
      if (row && Date.parse(row.expires_at) > Date.now() && row.owner_id !== ownerId) return Object.freeze({ acquired: false, fencingToken: Number(row.fencing_token) })
      const next = row ? Number(row.fencing_token) + 1 : 1
      await sql.unsafe("INSERT INTO refresh_control.refresh_lease(lease_key,owner_id,fencing_token,acquired_at,expires_at,released_at) VALUES($1,$2,$3,now(),now()+($4::text||' seconds')::interval,NULL) ON CONFLICT (lease_key) DO UPDATE SET owner_id=EXCLUDED.owner_id,fencing_token=EXCLUDED.fencing_token,acquired_at=EXCLUDED.acquired_at,expires_at=EXCLUDED.expires_at,released_at=NULL", [leaseKey, ownerId, next, leaseSeconds])
      return Object.freeze({ acquired: true, fencingToken: next })
    })
  }

  async assertFence(leaseKey: string, ownerId: string, fencingToken: number): Promise<void> {
    const rows = await this.client.sql.unsafe<Array<{ valid: boolean }>>("SELECT owner_id=$2 AND fencing_token=$3 AND expires_at>now() AND released_at IS NULL valid FROM refresh_control.refresh_lease WHERE lease_key=$1", [leaseKey, ownerId, fencingToken])
    if (!rows[0]?.valid) throw new Error("REFRESH_LEASE_FENCE_LOST")
  }

  async releaseLease(leaseKey: string, ownerId: string, fencingToken: number): Promise<void> {
    const result = await this.client.sql.unsafe("UPDATE refresh_control.refresh_lease SET released_at=now() WHERE lease_key=$1 AND owner_id=$2 AND fencing_token=$3 AND released_at IS NULL AND expires_at>now()", [leaseKey, ownerId, fencingToken])
    if (result.count !== 1) throw new Error("REFRESH_LEASE_FENCE_LOST")
  }

  async status(): Promise<object> {
    const runs = await this.client.sql.unsafe<Array<{ run_id: string; state: string; blocker_codes: string[]; updated_at: string }>>("SELECT run_id,state,blocker_codes,updated_at::text FROM refresh_control.refresh_run ORDER BY created_at DESC LIMIT 10")
    const counts = await this.client.sql.unsafe<Array<{ state: string; count: string }>>("SELECT state,count(*)::text count FROM refresh_control.refresh_unit GROUP BY state ORDER BY state")
    return Object.freeze({ runs, unitCounts: counts.map((row) => ({ state: row.state, count: Number(row.count) })) })
  }

  async reset(): Promise<void> { await this.client.sql.unsafe("TRUNCATE refresh_control.refresh_event,refresh_control.activation_readiness,refresh_control.release_comparison,refresh_control.release_manifest_entry,refresh_control.release_manifest,refresh_control.candidate_validation,refresh_control.refresh_candidate,refresh_control.refresh_artifact,refresh_control.source_availability_observation,refresh_control.source_watermark,refresh_control.refresh_unit,refresh_control.refresh_run,refresh_control.refresh_plan,refresh_control.refresh_policy,refresh_control.refresh_lease CASCADE") }
}
