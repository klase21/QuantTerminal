import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"
import type { MvpRefreshPostgresClient } from "./client"
import { isLegalRunTransition, isLegalUnitTransition, type RefreshPlan, type RefreshRunState, type RefreshUnitState } from "./contracts"

export interface RefreshUnitInput {
  readonly unitId: string
  readonly runId: string
  readonly instrument: string
  readonly datasetId: string
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly checksum: string
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

  async status(): Promise<object> {
    const runs = await this.client.sql.unsafe<Array<{ run_id: string; state: string; blocker_codes: string[]; updated_at: string }>>("SELECT run_id,state,blocker_codes,updated_at::text FROM refresh_control.refresh_run ORDER BY created_at DESC LIMIT 10")
    const counts = await this.client.sql.unsafe<Array<{ state: string; count: string }>>("SELECT state,count(*)::text count FROM refresh_control.refresh_unit GROUP BY state ORDER BY state")
    return Object.freeze({ runs, unitCounts: counts.map((row) => ({ state: row.state, count: Number(row.count) })) })
  }

  async reset(): Promise<void> { await this.client.sql.unsafe("TRUNCATE refresh_control.refresh_event,refresh_control.activation_readiness,refresh_control.release_comparison,refresh_control.release_manifest_entry,refresh_control.release_manifest,refresh_control.candidate_validation,refresh_control.refresh_candidate,refresh_control.refresh_artifact,refresh_control.source_availability_observation,refresh_control.source_watermark,refresh_control.refresh_unit,refresh_control.refresh_run,refresh_control.refresh_plan,refresh_control.refresh_policy,refresh_control.refresh_lease CASCADE") }
}
