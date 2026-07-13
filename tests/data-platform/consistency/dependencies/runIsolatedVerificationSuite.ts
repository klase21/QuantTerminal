import {
  ConsistencyDependencyStore,
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  ConsistencyResultStore,
  ConsistencyRunStore,
  D4_MIGRATION_ORDER,
  resetD4Runtime,
  verifyEnvironment,
} from "@/lib/data-platform/consistency-evidence/postgres"
import {
  analyzeImpact,
  createDependencyEdge,
  createDependencyNode,
  createDependencySnapshot,
  createRecomputePlan,
  createRecomputeRequest,
  type DependencyNode,
} from "@/lib/data-platform/consistency"
import { createResultFixture, RESULT_FIXTURE_CUTOFF, RESULT_FIXTURE_END, RESULT_FIXTURE_START } from "../results/fixtures"

const at="2026-03-01T00:00:00.000Z"

async function main(){
  const environment={D4_ISOLATED_POSTGRES_URL:process.env.D4_ISOLATED_POSTGRES_URL,D2_ISOLATED_POSTGRES_URL:process.env.D2_ISOLATED_POSTGRES_URL,D3_ISOLATED_POSTGRES_URL:process.env.D3_ISOLATED_POSTGRES_URL,DATABASE_URL:process.env.DATABASE_URL}
  const target=verifyEnvironment(environment)
  console.log(JSON.stringify({host:target.host,port:target.port,database:target.database,sslMode:target.sslMode,safe:target.safe}))
  const owner=new ConsistencyPostgresRuntime({connectionString:environment.D4_ISOLATED_POSTGRES_URL!,environment,roleIntent:"MIGRATION_OWNER",maxConnections:2,connectTimeoutSeconds:10,idleTimeoutSeconds:30,applicationName:"quantterminal-d4-phase2c-migrations"})
  const worker=new ConsistencyPostgresRuntime({connectionString:environment.D4_ISOLATED_POSTGRES_URL!,environment,roleIntent:"CONSISTENCY_WORKER",maxConnections:4,connectTimeoutSeconds:10,idleTimeoutSeconds:30,applicationName:"quantterminal-d4-phase2c-dependencies"})
  const checks:Array<[string,boolean]>=[];const check=(name:string,passed:boolean)=>checks.push([name,passed])
  try{
    const db=await owner.connect();check("isolated database verified",db.database==="quantterminal_d4_isolated")
    await resetD4Runtime(owner,{explicitOptIn:"RESET_D4_ISOLATED_DATABASE",auditIdentity:"d4-phase2c-certification"})
    const migrations=await new ConsistencyMigrationRunner(owner).apply("d4-phase2c-certification")
    check("all D4 migrations apply",migrations.length===D4_MIGRATION_ORDER.length&&migrations.every(value=>value.status==="APPLIED"))
    const rerun=await new ConsistencyMigrationRunner(owner).apply("d4-phase2c-certification")
    check("migration rerun skips",rerun.length===D4_MIGRATION_ORDER.length&&rerun.every(value=>value.status==="SKIPPED"))
    await seedRules(owner);await worker.connect()

    const resultRequest=createResultFixture();const runStore=new ConsistencyRunStore(worker);const resultStore=new ConsistencyResultStore(worker)
    await runStore.create(resultRequest.runSpecification);const resultWrite=await resultStore.write(resultRequest)
    if(resultWrite.status!=="CREATED")throw new Error("RESULT_FIXTURE_CREATION_FAILED")

    const graph=createGraph(resultWrite.result.resultId)
    const store=new ConsistencyDependencyStore(worker)
    const nodeOnly=createDependencySnapshot(graph.nodes,[],"1",true,[],at)
    check("node-only snapshot created",(await store.persistSnapshot(nodeOnly)).status==="CREATED")
    const edgeRace=await Promise.all([store.registerEdge(graph.edges[0]!),store.registerEdge(graph.edges[0]!)])
    check("parallel identical edge one CREATED one DUPLICATE",edgeRace.filter(value=>value.status==="CREATED").length===1&&edgeRace.filter(value=>value.status==="DUPLICATE").length===1)
    const conflictingEdge={...graph.edges[0]!,policyVersion:"2",checksum:"f".repeat(64)}
    const edgeConflict=await store.registerEdge(conflictingEdge)
    check("incompatible edge CONFLICT",edgeConflict.status==="CONFLICT")
    const edgeCounts=await worker.sql.unsafe<{edges:number;conflicts:number}[]>("SELECT (SELECT count(*)::int FROM consistency.dependency_edges WHERE edge_id=$1) edges,(SELECT count(*)::int FROM consistency.dependency_edge_conflicts WHERE edge_id=$1) conflicts",[graph.edges[0]!.edgeId])
    check("edge conflict preserves original",edgeCounts[0]?.edges===1&&edgeCounts[0]?.conflicts===1)

    const snapshot=createDependencySnapshot(graph.nodes,graph.edges,"1",true,[],at)
    check("complete graph snapshot created",(await store.persistSnapshot(snapshot)).status==="CREATED")
    check("snapshot duplicate idempotent",(await store.persistSnapshot(snapshot)).status==="DUPLICATE")
    const unknownSnapshot=createDependencySnapshot(graph.nodes,graph.edges,"2",true,[],at)
    const unknownStore=new ConsistencyDependencyStore(worker,{fail:point=>{if(point==="AFTER_COMMIT_UNKNOWN")throw new Error(point)}})
    check("snapshot unknown commit reconciled",(await unknownStore.persistSnapshot(unknownSnapshot)).status==="DUPLICATE")

    const rollbackGraph=createGraph("rollback-result","1","1.0.0","rollback")
    const rollbackSnapshot=createDependencySnapshot(rollbackGraph.nodes,rollbackGraph.edges,"rollback",true,[],at)
    let rollbackFailed=false;try{await new ConsistencyDependencyStore(worker,{fail:point=>{if(point==="AFTER_EDGE")throw new Error(point)}}).persistSnapshot(rollbackSnapshot)}catch{rollbackFailed=true}
    const rollbackRows=await worker.sql.unsafe<{nodes:number;edges:number;snapshots:number}[]>("SELECT (SELECT count(*)::int FROM consistency.dependency_nodes WHERE node_id=ANY($1)) nodes,(SELECT count(*)::int FROM consistency.dependency_edges WHERE edge_id=ANY($2)) edges,(SELECT count(*)::int FROM consistency.dependency_snapshots WHERE snapshot_id=$3) snapshots",[rollbackGraph.nodes.map(value=>value.nodeId),rollbackGraph.edges.map(value=>value.edgeId),rollbackSnapshot.snapshotId])
    check("snapshot failure rolls back all graph rows",rollbackFailed&&rollbackRows[0]?.nodes===0&&rollbackRows[0]?.edges===0&&rollbackRows[0]?.snapshots===0)

    const v2Graph=createGraph(resultWrite.result.resultId,"2","1.0.0")
    const v2Snapshot=createDependencySnapshot(v2Graph.nodes,v2Graph.edges,"replacement-v2",true,[],at)
    await store.persistSnapshot(v2Snapshot)
    const impact=analyzeImpact({changedNode:v2Graph.fact,replacedNodeId:graph.fact.nodeId,reason:"FACT_CORRECTED",snapshot,maxDepth:10,requestedAt:at})
    const request=createRecomputeRequest(impact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,recomputePolicyVersion:"1",targetResultIds:[resultWrite.result.resultId],targetSnapshotId:v2Snapshot.snapshotId,createdAt:at})
    const plan=createRecomputePlan(request,v2Snapshot,impact,at)
    const requestRace=await Promise.all([store.persistRecompute(request,plan),store.persistRecompute(request,plan)])
    check("parallel recompute one CREATED one DUPLICATE",requestRace.filter(value=>value.status==="CREATED").length===1&&requestRace.filter(value=>value.status==="DUPLICATE").length===1)
    const requestCounts=await worker.sql.unsafe<{requests:number;plans:number;steps:number}[]>("SELECT (SELECT count(*)::int FROM consistency.recompute_requests_v2 WHERE request_id=$1) requests,(SELECT count(*)::int FROM consistency.recompute_plans WHERE plan_id=$2) plans,(SELECT count(*)::int FROM consistency.recompute_plan_steps WHERE plan_id=$2) steps",[request.requestId,plan.planId])
    check("one complete persisted plan",requestCounts[0]?.requests===1&&requestCounts[0]?.plans===1&&requestCounts[0]?.steps===plan.steps.length)

    const rollbackRequest=createRecomputeRequest(impact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:"2026-02-01T00:59:00.000Z",recomputePolicyVersion:"rollback",targetResultIds:[resultWrite.result.resultId],targetSnapshotId:v2Snapshot.snapshotId,createdAt:at})
    const rollbackPlan=createRecomputePlan(rollbackRequest,v2Snapshot,impact,at)
    let planRollbackFailed=false;try{await new ConsistencyDependencyStore(worker,{fail:point=>{if(point==="AFTER_FIRST_STEP")throw new Error(point)}}).persistRecompute(rollbackRequest,rollbackPlan)}catch{planRollbackFailed=true}
    const planRollbackRows=await worker.sql.unsafe<{requests:number;plans:number;steps:number}[]>("SELECT (SELECT count(*)::int FROM consistency.recompute_requests_v2 WHERE request_id=$1) requests,(SELECT count(*)::int FROM consistency.recompute_plans WHERE plan_id=$2) plans,(SELECT count(*)::int FROM consistency.recompute_plan_steps WHERE plan_id=$2) steps",[rollbackRequest.requestId,rollbackPlan.planId])
    check("plan failure rolls back request plan and steps",planRollbackFailed&&planRollbackRows[0]?.requests===0&&planRollbackRows[0]?.plans===0&&planRollbackRows[0]?.steps===0)
    check("plan deterministic retry succeeds",(await store.persistRecompute(rollbackRequest,rollbackPlan)).status==="CREATED")
    const unknownRequest=createRecomputeRequest(impact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"LATEST_CORRECTED",knowledgeTimeCutoff:"2026-02-02T00:00:00.000Z",recomputePolicyVersion:"unknown",targetResultIds:[resultWrite.result.resultId],targetSnapshotId:v2Snapshot.snapshotId,createdAt:at})
    const unknownPlan=createRecomputePlan(unknownRequest,v2Snapshot,impact,at)
    check("recompute unknown commit reconciled",(await new ConsistencyDependencyStore(worker,{fail:point=>{if(point==="AFTER_COMMIT_UNKNOWN")throw new Error(point)}}).persistRecompute(unknownRequest,unknownPlan)).status==="DUPLICATE")

    const replacementRequest=createResultFixture({inputs:[(await import("../results/fixtures")).temporalFact("result-a","left",2),(await import("../results/fixtures")).temporalFact("result-b","right",1)]})
    await runStore.create(replacementRequest.runSpecification);const replacementWrite=await resultStore.write(replacementRequest);if(replacementWrite.status!=="CREATED")throw new Error("REPLACEMENT_RESULT_CREATION_FAILED")
    const dependentRequest=createResultFixture({inputs:[(await import("../results/fixtures")).temporalFact("result-a","left",2),(await import("../results/fixtures")).temporalFact("result-b","right",1)],ruleId:"dependent-rule"})
    await runStore.create(dependentRequest.runSpecification);const dependentWrite=await resultStore.write(dependentRequest);if(dependentWrite.status!=="CREATED")throw new Error("DEPENDENT_RESULT_CREATION_FAILED")
    const leaseEnd="2026-03-01T00:05:00.000Z"
    const first=plan.steps[0]!;const claims=await Promise.all([store.claimStep(first.stepId,"worker-a",at,leaseEnd),store.claimStep(first.stepId,"worker-b",at,leaseEnd)])
    check("one governed step owner",claims.filter(value=>value.status==="CLAIMED").length===1&&claims.filter(value=>value.status==="DUPLICATE_CLAIM").length===1)
    const firstOwner=claims[0]!.status==="CLAIMED"?"worker-a":"worker-b",firstToken=claims.find(value=>value.status==="CLAIMED")!.fencingToken
    check("first step completes with new immutable V2 Result link",(await store.linkResultAndComplete({stepId:first.stepId,planId:plan.planId,snapshotId:v2Snapshot.snapshotId,resultId:replacementWrite.result.resultId,occurredAt:at,workerId:firstOwner,fencingToken:firstToken}))==="COMPLETED")
    const second=plan.steps[1]!,secondClaim=await store.claimStep(second.stepId,"worker-c",at,leaseEnd)
    const terminalRace=await Promise.all([store.linkResultAndComplete({stepId:second.stepId,planId:plan.planId,snapshotId:v2Snapshot.snapshotId,resultId:dependentWrite.result.resultId,occurredAt:at,workerId:"worker-c",fencingToken:secondClaim.fencingToken}),store.finishStep(second.stepId,"CANCELLED",["BOUNDED_CANCELLATION"],at,"worker-c",secondClaim.fencingToken)])
    const terminalRows=await worker.sql.unsafe<{events:number;links:number;outcome:string}[]>("SELECT (SELECT count(*)::int FROM consistency.recompute_step_events WHERE step_id=$1) events,(SELECT count(*)::int FROM consistency.result_dependency_links WHERE step_id=$1) links,(SELECT outcome FROM consistency.recompute_step_events WHERE step_id=$1 LIMIT 1) outcome",[second.stepId])
    check("completion cancellation race has one terminal state",terminalRace[0]===terminalRace[1]&&terminalRows[0]?.events===1)
    check("cancelled step cannot retain false Result link",terminalRows[0]?.outcome==="COMPLETED"?terminalRows[0].links===1:terminalRows[0]?.links===0)

    const selection=(await import("@/lib/data-platform/consistency")).selectConsistencyResult({candidates:[{subjectId:"bounded-subject",result:resultWrite.result}],subjectId:"bounded-subject",eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,policyVersion:"1",knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,preferredRuleVersion:"1.0.0",supersededResultIds:[],createdAt:at})
    check("selection decision append-only and idempotent",(await store.persistSelection(selection))==="CREATED"&&(await store.persistSelection(selection))==="DUPLICATE")

    const factV2Graph=createGraph(resultWrite.result.resultId,"2","1.0.0","concurrent-fact")
    const ruleV2Graph=createGraph(resultWrite.result.resultId,"1","2.0.0")
    const [factV2Snapshot,ruleV2Snapshot]=await Promise.all([
      store.persistSnapshot(createDependencySnapshot(factV2Graph.nodes,factV2Graph.edges,"fact-v2",true,[],at)),
      store.persistSnapshot(createDependencySnapshot(ruleV2Graph.nodes,ruleV2Graph.edges,"rule-v2",true,[],at)),
    ])
    check("concurrent version snapshots remain deterministic",factV2Snapshot.status==="CREATED"&&ruleV2Snapshot.status==="CREATED")

    let immutableDenied=false;try{await worker.sql.unsafe("UPDATE consistency.dependency_edges SET policy_version='changed' WHERE edge_id=$1",[graph.edges[0]!.edgeId])}catch(error){immutableDenied=["42501","55000"].includes(postgresCode(error)??"")}
    check("physical dependency mutation denied",immutableDenied)
    const reconcile=await worker.sql.unsafe<{orphan_edges:number;orphan_links:number;false_completion:number}[]>("SELECT (SELECT count(*)::int FROM consistency.dependency_edges e LEFT JOIN consistency.dependency_nodes f ON f.node_id=e.from_node_id LEFT JOIN consistency.dependency_nodes t ON t.node_id=e.to_node_id WHERE f.node_id IS NULL OR t.node_id IS NULL) orphan_edges,(SELECT count(*)::int FROM consistency.result_dependency_links l LEFT JOIN consistency.immutable_results r ON r.result_id=l.result_id WHERE r.result_id IS NULL) orphan_links,(SELECT count(*)::int FROM consistency.recompute_step_events e WHERE e.outcome='COMPLETED' AND NOT EXISTS(SELECT 1 FROM consistency.result_dependency_links l WHERE l.step_id=e.step_id)) false_completion")
    check("persisted dependency reconciliation passes",reconcile[0]?.orphan_edges===0&&reconcile[0]?.orphan_links===0&&reconcile[0]?.false_completion===0)

    const failures=checks.filter(([,passed])=>!passed);console.log(`D4 PHASE 2C ISOLATED POSTGRESQL SUITE: ${failures.length?"FAIL":"PASS"}`);for(const [name,passed] of checks)console.log(`[${passed?"PASS":"FAIL"}] ${name}`);if(failures.length)process.exitCode=1
  }finally{await worker.shutdown();await owner.shutdown()}
}

function createGraph(resultId:string,factVersion="1",ruleVersion="1.0.0",namespace="live"){
  const node=(kind:DependencyNode["kind"],objectId:string,version:string)=>createDependencyNode({kind,objectId,objectVersion:version,metadata:[],createdAt:at})
  const fact=node("CANONICAL_FACT_VERSION",namespace==="live"?"result-a":`fact-${namespace}`,factVersion),ruleA=node("RULE_VERSION",namespace==="live"?"result-rule":`result-rule-${namespace}`,ruleVersion),ruleB=node("RULE_VERSION",namespace==="live"?"dependent-rule":`dependent-rule-${namespace}`,"1.0.0"),policy=node("POLICY_VERSION",`temporal-policy-${namespace}`,"1"),alignment=node("TEMPORAL_ALIGNMENT",`alignment-${namespace}`,"1"),result=node("CONSISTENCY_RESULT",resultId,"1")
  const nodes=[fact,ruleA,ruleB,policy,alignment,result],map=new Map(nodes.map(value=>[value.nodeId,value]))
  const edge=(kind:Parameters<typeof createDependencyEdge>[0]["kind"],from:string,to:string)=>createDependencyEdge({kind,fromNodeId:from,toNodeId:to,policyVersion:"1",createdAt:at},map)
  const edges=[edge("FACT_INPUT_TO_RULE",fact.nodeId,ruleA.nodeId),edge("RULE_DEPENDS_ON_RULE",ruleA.nodeId,ruleB.nodeId),edge("POLICY_GOVERNS_RULE",policy.nodeId,ruleA.nodeId),edge("FACT_USED_BY_ALIGNMENT",fact.nodeId,alignment.nodeId),edge("ALIGNMENT_USED_BY_RESULT",alignment.nodeId,result.nodeId),edge("RULE_PRODUCED_RESULT",ruleA.nodeId,result.nodeId)]
  return{fact,nodes,edges}
}
async function seedRules(runtime:ConsistencyPostgresRuntime){await runtime.sql.unsafe("INSERT INTO consistency.rule_sets(rule_set_id,rule_set_version,policy_version_id,state,definition_checksum,created_at) VALUES('RESULT-RULES','1.0.0','result-policy','APPROVED',repeat('a',64),'2026-02-01T00:00:00Z')");for(const [id,version,checksum] of [["result-rule","1.0.0","b"],["result-rule","2.0.0","c"],["dependent-rule","1.0.0","d"]] as const)await runtime.sql.unsafe("INSERT INTO consistency.rules(rule_id,rule_version,rule_set_id,rule_set_version,category,semantic_class,diagnostics_schema_version,policy_version_id,default_severity,definition_checksum,created_at) VALUES($1,$2,'RESULT-RULES','1.0.0','DATASET_AGREEMENT','FACTUAL','1','result-policy','BLOCKING',repeat($3,64),'2026-02-01T00:00:00Z')",[id,version,checksum])}
function postgresCode(error:unknown):string|null{return typeof error==="object"&&error!==null&&"code" in error?String((error as {code:unknown}).code):null}
void main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:error);process.exitCode=1})
