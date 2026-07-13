import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type {
  DependencyEdge,
  DependencyGraphSnapshot,
  DependencySnapshotWriteOutcome,
  DependencyWriteOutcome,
  RecomputeCreateOutcome,
  RecomputeExecutionOutcome,
  RecomputeLeaseClaimOutcome,
  RecomputePlan,
  RecomputeRequest,
  ResultSelectionDecision,
} from "@/lib/data-platform/consistency"
import type postgres from "postgres"
import type { ConsistencyPostgresRuntime } from "./client"

export type DependencyStoreFailurePoint =
  | "AFTER_NODE"
  | "AFTER_EDGE"
  | "AFTER_SNAPSHOT"
  | "AFTER_REQUEST"
  | "AFTER_PLAN"
  | "AFTER_FIRST_STEP"
  | "AFTER_RESULT_LINK"
  | "AFTER_COMPLETION"
  | "AFTER_COMMIT_UNKNOWN"

export interface DependencyStoreFaultInjector { readonly fail: (point: DependencyStoreFailurePoint) => void }
type StepTerminalOutcome = Extract<RecomputeExecutionOutcome, "COMPLETED" | "FAILED" | "CANCELLED" | "BLOCKED_DEPENDENCY">

export class ConsistencyDependencyStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime, private readonly faults?: DependencyStoreFaultInjector) {
    if (runtime.roleIntent !== "CONSISTENCY_WORKER") throw new Error("CONSISTENCY_WORKER_ROLE_REQUIRED")
  }

  async persistSnapshot(snapshot: DependencyGraphSnapshot): Promise<DependencySnapshotWriteOutcome> {
    try {
      const outcome = await this.runtime.transaction(async (sql) => {
        await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [snapshot.snapshotId])
        for (const node of snapshot.nodes) {
          const rows = await sql.unsafe<{ node_checksum: string }[]>("INSERT INTO consistency.dependency_nodes VALUES($1,$2,$3,$4,$5,$6::text::jsonb,$7) ON CONFLICT(node_id) DO NOTHING RETURNING node_checksum", [node.nodeId,node.kind,node.objectId,node.objectVersion,node.checksum,JSON.stringify(node.metadata),node.createdAt])
          if (!rows.length) {
            const existing = await sql.unsafe<{ node_checksum: string }[]>("SELECT node_checksum FROM consistency.dependency_nodes WHERE node_id=$1", [node.nodeId])
            if (existing[0]?.node_checksum !== node.checksum) throw new Error("DEPENDENCY_NODE_CONFLICT")
          }
          this.faults?.fail("AFTER_NODE")
        }
        for (const edge of snapshot.edges) {
          const edgeOutcome = await this.persistEdgeTransaction(sql, edge)
          if (edgeOutcome.status === "CONFLICT") throw new Error("DEPENDENCY_EDGE_CONFLICT")
          this.faults?.fail("AFTER_EDGE")
        }
        const inserted = await sql.unsafe<{ snapshot_id: string }[]>("INSERT INTO consistency.dependency_snapshots VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(snapshot_id) DO NOTHING RETURNING snapshot_id", [snapshot.snapshotId,snapshot.schemaVersion,snapshot.complete,snapshot.missingNodeIds,snapshot.checksum,snapshot.createdAt])
        if (!inserted.length) {
          const existing = await sql.unsafe<{ snapshot_checksum: string }[]>("SELECT snapshot_checksum FROM consistency.dependency_snapshots WHERE snapshot_id=$1", [snapshot.snapshotId])
          if (existing[0]?.snapshot_checksum !== snapshot.checksum) return { status: "CONFLICT", snapshotId: snapshot.snapshotId } as const
          return { status: "DUPLICATE", snapshot } as const
        }
        for (const node of snapshot.nodes) await sql.unsafe("INSERT INTO consistency.dependency_snapshot_nodes VALUES($1,$2)", [snapshot.snapshotId,node.nodeId])
        for (const edge of snapshot.edges) await sql.unsafe("INSERT INTO consistency.dependency_snapshot_edges VALUES($1,$2)", [snapshot.snapshotId,edge.edgeId])
        this.faults?.fail("AFTER_SNAPSHOT")
        return { status: "CREATED", snapshot } as const
      })
      try { this.faults?.fail("AFTER_COMMIT_UNKNOWN"); return outcome }
      catch { return (await this.snapshotExists(snapshot.snapshotId, snapshot.checksum)) ? { status: "DUPLICATE", snapshot } : { status: "CONFLICT", snapshotId: snapshot.snapshotId } }
    } catch { throw new Error("DEPENDENCY_SNAPSHOT_TRANSACTION_FAILED") }
  }

  async registerEdge(edge: DependencyEdge): Promise<DependencyWriteOutcome> {
    return this.runtime.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [edge.edgeId])
      return this.persistEdgeTransaction(sql, edge)
    })
  }

  async persistRecompute(request: RecomputeRequest, plan: RecomputePlan): Promise<RecomputeCreateOutcome> {
    if (plan.blockingReasons.includes("CYCLE")) return { status: "BLOCKED_CYCLE", impactId: request.impactId }
    if (plan.blockingReasons.length) return { status: "BLOCKED_INCOMPLETE_GRAPH", impactId: request.impactId }
    if (!plan.steps.length) return { status: "NO_IMPACT", impactId: request.impactId }
    try {
      const outcome = await this.runtime.transaction(async (sql) => {
        await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [request.requestIdentity])
        const existing = await sql.unsafe<{ request_checksum: string }[]>("SELECT request_checksum FROM consistency.recompute_requests_v2 WHERE request_identity=$1", [request.requestIdentity])
        if (existing[0]) {
          if (existing[0].request_checksum === request.checksum) return { status: "DUPLICATE", request, plan } as const
          const conflictId = "reconf_" + canonicalChecksum({ requestId: request.requestId, existingChecksum: existing[0].request_checksum, incomingChecksum: request.checksum })
          await sql.unsafe("INSERT INTO consistency.recompute_conflicts VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [conflictId,request.requestId,existing[0].request_checksum,request.checksum,request.createdAt])
          return { status: "CONFLICT", requestId: request.requestId } as const
        }
        await sql.unsafe("INSERT INTO consistency.recompute_requests_v2 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)", [request.requestId,request.requestIdentity,request.triggeringNodeId,request.impactId,request.snapshotId,request.eventTimeStart,request.eventTimeEnd,request.knowledgeMode,request.knowledgeTimeCutoff,request.recomputePolicyVersion,request.targetResultIds,request.checksum,request.createdAt])
        this.faults?.fail("AFTER_REQUEST")
        await sql.unsafe("INSERT INTO consistency.recompute_plans VALUES($1,$2,$3,$4,$5,$6,$7)", [plan.planId,plan.requestId,plan.snapshotId,plan.skippedNodeIds,plan.blockingReasons,plan.checksum,plan.createdAt])
        this.faults?.fail("AFTER_PLAN")
        for (let index=0; index<plan.steps.length; index+=1) {
          const step=plan.steps[index]!
          await sql.unsafe("INSERT INTO consistency.recompute_plan_steps VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)", [step.stepId,plan.planId,step.ordinal,step.ruleNodeId,step.dependencyStepIds,step.exactFactNodeIds,step.policyNodeIds,step.priorResultNodeIds,step.checksum])
          if (index===0) this.faults?.fail("AFTER_FIRST_STEP")
        }
        return { status: "CREATED", request, plan } as const
      })
      try { this.faults?.fail("AFTER_COMMIT_UNKNOWN"); return outcome }
      catch { return (await this.recomputeExists(request.requestId,request.checksum,plan.planId,plan.checksum)) ? { status:"DUPLICATE",request,plan } : { status:"CONFLICT",requestId:request.requestId } }
    } catch { throw new Error("RECOMPUTE_TRANSACTION_FAILED") }
  }

  async claimStep(stepId: string, workerId: string, claimedAt: string, expiresAt: string): Promise<RecomputeLeaseClaimOutcome> {
    const rows=await this.runtime.sql.unsafe<{claim_status:RecomputeLeaseClaimOutcome["status"];fencing_token:string|number}[]>("SELECT * FROM consistency.claim_recompute_step($1,$2,$3,$4)",[stepId,workerId,claimedAt,expiresAt])
    if(!rows[0])throw new Error("RECOMPUTE_CLAIM_OUTCOME_MISSING")
    return Object.freeze({status:rows[0].claim_status,fencingToken:Number(rows[0].fencing_token)})
  }

  async heartbeatStep(stepId:string,workerId:string,fencingToken:number,occurredAt:string,expiresAt:string):Promise<boolean>{const rows=await this.runtime.sql.unsafe<{valid:boolean}[]>("SELECT consistency.heartbeat_recompute_step($1,$2,$3,$4,$5) valid",[stepId,workerId,fencingToken,occurredAt,expiresAt]);return Boolean(rows[0]?.valid)}

  async finishStep(stepId: string, outcome: Exclude<StepTerminalOutcome,"COMPLETED">, reasonCodes: readonly string[], occurredAt: string, workerId:string, fencingToken:number): Promise<StepTerminalOutcome> {
    return this.finishTransaction(stepId,outcome,null,reasonCodes,occurredAt,workerId,fencingToken)
  }

  async linkResultAndComplete(input:{readonly stepId:string;readonly planId:string;readonly snapshotId:string;readonly resultId:string;readonly occurredAt:string;readonly workerId:string;readonly fencingToken:number}):Promise<StepTerminalOutcome>{
    return this.runtime.transaction(async sql=>{
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))",[input.stepId])
      const existing=await sql.unsafe<{outcome:StepTerminalOutcome}[]>("SELECT outcome FROM consistency.recompute_step_events WHERE step_id=$1 ORDER BY occurred_at,event_id LIMIT 1",[input.stepId])
      if(existing[0])return existing[0].outcome
      if(!(await this.fenceValid(sql,input.stepId,input.workerId,input.fencingToken,input.occurredAt)))throw new Error("STALE_RECOMPUTE_FENCE")
      await this.verifyStepReady(sql,input.stepId)
      await this.verifyResultBinding(sql,input.stepId,input.resultId)
      await sql.unsafe("INSERT INTO consistency.result_dependency_links VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",[input.resultId,input.snapshotId,input.planId,input.stepId,input.occurredAt])
      this.faults?.fail("AFTER_RESULT_LINK")
      const outcome=await this.insertTerminal(sql,input.stepId,"COMPLETED",input.resultId,[],input.occurredAt)
      const closed=await sql.unsafe<{valid:boolean}[]>("SELECT consistency.close_recompute_step_lease($1,$2,$3,'COMPLETED',$4) valid",[input.stepId,input.workerId,input.fencingToken,input.occurredAt]);if(!closed[0]?.valid)throw new Error("RECOMPUTE_LEASE_COMPLETION_FAILED")
      this.faults?.fail("AFTER_COMPLETION")
      return outcome
    })
  }

  async persistSelection(decision:ResultSelectionDecision):Promise<"CREATED"|"DUPLICATE"|"CONFLICT">{
    return this.runtime.transaction(async sql=>{
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))",[decision.decisionId])
      const existing=await sql.unsafe<{decision_checksum:string}[]>("SELECT decision_checksum FROM consistency.result_selection_decisions WHERE decision_id=$1",[decision.decisionId])
      if(existing[0])return existing[0].decision_checksum===decision.checksum?"DUPLICATE":"CONFLICT"
      await sql.unsafe("INSERT INTO consistency.result_selection_decisions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[decision.decisionId,decision.selectedResultId,decision.rejectedResultIds,decision.reasonCodes,decision.policyVersion,decision.knowledgeMode,decision.knowledgeTimeCutoff,decision.checksum,decision.createdAt])
      return "CREATED"
    })
  }

  private async finishTransaction(stepId:string,outcome:Exclude<StepTerminalOutcome,"COMPLETED">,resultId:null,reasons:readonly string[],occurredAt:string,workerId:string,fencingToken:number):Promise<StepTerminalOutcome>{return this.runtime.transaction(async sql=>{await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))",[stepId]);const existing=await sql.unsafe<{outcome:StepTerminalOutcome}[]>("SELECT outcome FROM consistency.recompute_step_events WHERE step_id=$1 ORDER BY occurred_at,event_id LIMIT 1",[stepId]);if(existing[0])return existing[0].outcome;if(!(await this.fenceValid(sql,stepId,workerId,fencingToken,occurredAt)))throw new Error("STALE_RECOMPUTE_FENCE");const terminal=await this.insertTerminal(sql,stepId,outcome,resultId,reasons,occurredAt);const closed=await sql.unsafe<{valid:boolean}[]>("SELECT consistency.close_recompute_step_lease($1,$2,$3,'RELEASED',$4) valid",[stepId,workerId,fencingToken,occurredAt]);if(!closed[0]?.valid)throw new Error("RECOMPUTE_LEASE_RELEASE_FAILED");return terminal})}
  private async insertTerminal(sql:postgres.TransactionSql,stepId:string,outcome:StepTerminalOutcome,resultId:string|null,reasons:readonly string[],occurredAt:string):Promise<StepTerminalOutcome>{const material={stepId,outcome,resultId,reasonCodes:[...reasons].sort()};const checksum=canonicalChecksum(material);const rows=await sql.unsafe<{outcome:StepTerminalOutcome}[]>("INSERT INTO consistency.recompute_step_events VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING outcome",["rstep_event_"+checksum,stepId,outcome,resultId,material.reasonCodes,checksum,occurredAt]);if(rows[0])return rows[0].outcome;const existing=await sql.unsafe<{outcome:StepTerminalOutcome}[]>("SELECT outcome FROM consistency.recompute_step_events WHERE step_id=$1 ORDER BY occurred_at,event_id LIMIT 1",[stepId]);if(!existing[0])throw new Error("RECOMPUTE_TERMINAL_WRITE_FAILED");return existing[0].outcome}
  private async verifyStepReady(sql:postgres.TransactionSql,stepId:string):Promise<void>{const rows=await sql.unsafe<{dependency_step_ids:string[]}[]>("SELECT dependency_step_ids FROM consistency.recompute_plan_steps WHERE step_id=$1",[stepId]);if(!rows[0])throw new Error("RECOMPUTE_STEP_MISSING");const claimed=await sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.recompute_step_claims WHERE step_id=$1) valid",[stepId]);if(!claimed[0]?.valid)throw new Error("RECOMPUTE_STEP_NOT_CLAIMED");for(const dependency of rows[0].dependency_step_ids){const done=await sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.recompute_step_events WHERE step_id=$1 AND outcome='COMPLETED') valid",[dependency]);if(!done[0]?.valid)throw new Error("RECOMPUTE_DEPENDENCY_INCOMPLETE")}}
  private async verifyResultBinding(sql:postgres.TransactionSql,stepId:string,resultId:string):Promise<void>{const rule=await sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.recompute_plan_steps s JOIN consistency.dependency_nodes n ON n.node_id=s.rule_node_id JOIN consistency.immutable_results r ON r.result_id=$2 AND r.rule_id=n.object_id AND r.rule_version=n.object_version WHERE s.step_id=$1) valid",[stepId,resultId]);if(!rule[0]?.valid)throw new Error("RECOMPUTE_RESULT_RULE_MISMATCH");const facts=await sql.unsafe<{node_id:string;object_id:string;object_version:string}[]>("SELECT n.node_id,n.object_id,n.object_version FROM consistency.recompute_plan_steps s JOIN LATERAL unnest(s.exact_fact_node_ids) f(node_id) ON true JOIN consistency.dependency_nodes n ON n.node_id=f.node_id WHERE s.step_id=$1",[stepId]);for(const fact of facts){const valid=await sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.result_input_references WHERE result_id=$1 AND canonical_record_id=$2 AND record_version=$3::int) valid",[resultId,fact.object_id,fact.object_version]);if(!valid[0]?.valid)throw new Error("RECOMPUTE_RESULT_FACT_MISMATCH")}}
  private async fenceValid(sql:postgres.TransactionSql,stepId:string,workerId:string,fencingToken:number,at:string):Promise<boolean>{const rows=await sql.unsafe<{valid:boolean}[]>("SELECT consistency.assert_recompute_step_fence($1,$2,$3,$4) valid",[stepId,workerId,fencingToken,at]);return Boolean(rows[0]?.valid)}
  private async persistEdgeTransaction(sql:postgres.TransactionSql,edge:DependencyEdge):Promise<DependencyWriteOutcome>{const rows=await sql.unsafe<{edge_checksum:string}[]>("INSERT INTO consistency.dependency_edges VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(edge_id) DO NOTHING RETURNING edge_checksum",[edge.edgeId,edge.kind,edge.fromNodeId,edge.toNodeId,edge.policyVersion,edge.checksum,edge.createdAt]);if(rows.length)return{status:"CREATED",edge};const existing=await sql.unsafe<{edge_checksum:string}[]>("SELECT edge_checksum FROM consistency.dependency_edges WHERE edge_id=$1",[edge.edgeId]);if(existing[0]?.edge_checksum===edge.checksum)return{status:"DUPLICATE",edge};const existingChecksum=existing[0]?.edge_checksum??"0".repeat(64);const conflictId="deconf_"+canonicalChecksum({edgeId:edge.edgeId,existingChecksum,incomingChecksum:edge.checksum});await sql.unsafe("INSERT INTO consistency.dependency_edge_conflicts VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",[conflictId,edge.edgeId,existingChecksum,edge.checksum,edge.createdAt]);return{status:"CONFLICT",edgeId:edge.edgeId}}
  private async snapshotExists(id:string,checksum:string):Promise<boolean>{const rows=await this.runtime.sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.dependency_snapshots WHERE snapshot_id=$1 AND snapshot_checksum=$2) valid",[id,checksum]);return Boolean(rows[0]?.valid)}
  private async recomputeExists(requestId:string,requestChecksum:string,planId:string,planChecksum:string):Promise<boolean>{const rows=await this.runtime.sql.unsafe<{valid:boolean}[]>("SELECT EXISTS(SELECT 1 FROM consistency.recompute_requests_v2 r JOIN consistency.recompute_plans p ON p.request_id=r.request_id WHERE r.request_id=$1 AND r.request_checksum=$2 AND p.plan_id=$3 AND p.plan_checksum=$4) valid",[requestId,requestChecksum,planId,planChecksum]);return Boolean(rows[0]?.valid)}
}
