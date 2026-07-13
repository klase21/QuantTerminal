import assert from "node:assert/strict"
import { createImmutableConsistencyResult } from "@/lib/data-platform/consistency"
import {
  analyzeImpact,
  createDependencyEdge,
  createDependencyNode,
  createDependencySnapshot,
  createRecomputePlan,
  createRecomputeRequest,
  reconcileDependency,
  selectConsistencyResult,
  type DependencyNode,
} from "@/lib/data-platform/consistency"
import { createResultFixture, RESULT_FIXTURE_CUTOFF, RESULT_FIXTURE_END, RESULT_FIXTURE_START, temporalFact } from "../results/fixtures"

const at="2026-03-01T00:00:00.000Z"
const node=(kind:DependencyNode["kind"],objectId:string,version:string,metadata:readonly {key:string;value:string}[]=[])=>createDependencyNode({kind,objectId,objectVersion:version,metadata,createdAt:at})
const factV1=node("CANONICAL_FACT_VERSION","fact-a","1",[{key:"recordVersion",value:"1"}])
const factV2=node("CANONICAL_FACT_VERSION","fact-a","2",[{key:"recordVersion",value:"2"}])
const ruleA=node("RULE_VERSION","rule-a","1.0.0")
const ruleB=node("RULE_VERSION","rule-b","1.0.0")
const policy=node("POLICY_VERSION","temporal-policy","1")
const alignment=node("TEMPORAL_ALIGNMENT","alignment-a","1")
const result=node("CONSISTENCY_RESULT","result-a","1")
const nodes=[factV1,ruleA,ruleB,policy,alignment,result]
const map=new Map(nodes.map(value=>[value.nodeId,value]))
const edge=(kind:Parameters<typeof createDependencyEdge>[0]["kind"],from:string,to:string,policyVersion="1")=>createDependencyEdge({kind,fromNodeId:from,toNodeId:to,policyVersion,createdAt:at},map)
const edges=[
  edge("FACT_INPUT_TO_RULE",factV1.nodeId,ruleA.nodeId),
  edge("RULE_DEPENDS_ON_RULE",ruleA.nodeId,ruleB.nodeId),
  edge("POLICY_GOVERNS_RULE",policy.nodeId,ruleA.nodeId),
  edge("FACT_USED_BY_ALIGNMENT",factV1.nodeId,alignment.nodeId),
  edge("ALIGNMENT_USED_BY_RESULT",alignment.nodeId,result.nodeId),
  edge("RULE_PRODUCED_RESULT",ruleA.nodeId,result.nodeId),
]

const reorderedNode=createDependencyNode({kind:"CANONICAL_FACT_VERSION",objectId:"fact-a",objectVersion:"1",metadata:[{key:"z",value:"2"},{key:"a",value:"1"}],createdAt:at})
const reorderedNodeAgain=createDependencyNode({kind:"CANONICAL_FACT_VERSION",objectId:"fact-a",objectVersion:"1",metadata:[{key:"a",value:"1"},{key:"z",value:"2"}],createdAt:at})
assert.equal(reorderedNode.nodeId,reorderedNodeAgain.nodeId)
assert.equal(reorderedNode.checksum,reorderedNodeAgain.checksum)
assert.equal(factV1.nodeId,reorderedNode.nodeId,"semantic node identity must exclude bounded metadata")
assert.notEqual(factV1.checksum,reorderedNode.checksum,"immutable metadata mismatch must be conflict-capable")

const edgeV2=edge("FACT_INPUT_TO_RULE",factV1.nodeId,ruleA.nodeId,"2")
assert.equal(edges[0]!.edgeId,edgeV2.edgeId)
assert.notEqual(edges[0]!.checksum,edgeV2.checksum)
assert.throws(()=>createDependencyEdge({kind:"FACT_INPUT_TO_RULE",fromNodeId:ruleA.nodeId,toNodeId:factV1.nodeId,policyVersion:"1",createdAt:at},map),/DEPENDENCY_EDGE_KIND_INVALID/)
assert.throws(()=>createDependencyEdge({kind:"RULE_DEPENDS_ON_RULE",fromNodeId:ruleA.nodeId,toNodeId:ruleA.nodeId,policyVersion:"1",createdAt:at},map),/DEPENDENCY_SELF_EDGE/)

const snapshot=createDependencySnapshot(nodes,edges,"1",true,[],at)
const reordered=createDependencySnapshot([...nodes].reverse(),[...edges].reverse(),"1",true,[],"2026-03-02T00:00:00.000Z")
assert.equal(snapshot.snapshotId,reordered.snapshotId)
assert.equal(snapshot.checksum,reordered.checksum)

const ruleCycle=edge("RULE_DEPENDS_ON_RULE",ruleB.nodeId,ruleA.nodeId)
assert.throws(()=>createDependencySnapshot(nodes,[...edges,ruleCycle],"1",true,[],at),/DEPENDENCY_GRAPH_CYCLE/)
const result2=node("CONSISTENCY_RESULT","result-b","1")
const supersessionMap=new Map([...nodes,result2].map(value=>[value.nodeId,value]))
const supersedesA=createDependencyEdge({kind:"RESULT_SUPERSEDES_RESULT",fromNodeId:result.nodeId,toNodeId:result2.nodeId,policyVersion:"1",createdAt:at},supersessionMap)
const supersedesB=createDependencyEdge({kind:"RESULT_SUPERSEDES_RESULT",fromNodeId:result2.nodeId,toNodeId:result.nodeId,policyVersion:"1",createdAt:at},supersessionMap)
assert.throws(()=>createDependencySnapshot([...nodes,result2],[supersedesA,supersedesB],"1",true,[],at),/RESULT_SUPERSESSION_CYCLE/)

const impact=analyzeImpact({changedNode:factV1,replacedNodeId:null,reason:"FACT_CORRECTED",snapshot,maxDepth:10,requestedAt:at})
assert.deepEqual(impact.directlyAffectedNodeIds,[alignment.nodeId,ruleA.nodeId].sort())
assert(impact.transitivelyAffectedNodeIds.includes(ruleB.nodeId))
assert(impact.transitivelyAffectedNodeIds.includes(result.nodeId))
assert.equal(impact.traversal,"COMPLETE")
const correctionImpact=analyzeImpact({changedNode:factV2,replacedNodeId:factV1.nodeId,reason:"FACT_CORRECTED",snapshot,maxDepth:10,requestedAt:at})
assert.deepEqual(correctionImpact.directlyAffectedNodeIds,impact.directlyAffectedNodeIds,"correction impact set must be rooted in the replaced exact Fact")
assert.notEqual(correctionImpact.checksum,impact.checksum,"the triggering exact Fact version remains identity-defining")
const incomplete=analyzeImpact({changedNode:factV1,replacedNodeId:null,reason:"FACT_BECAME_AVAILABLE",snapshot:createDependencySnapshot(nodes,edges,"1",false,["missing-node"],at),maxDepth:10,requestedAt:at})
assert.equal(incomplete.traversal,"INCOMPLETE")

const request=createRecomputeRequest(impact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,recomputePolicyVersion:"1",targetResultIds:[result.nodeId],createdAt:at})
const requestAgain=createRecomputeRequest(impact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,recomputePolicyVersion:"1",targetResultIds:[result.nodeId],createdAt:"2026-03-02T00:00:00.000Z"})
assert.equal(request.requestIdentity,requestAgain.requestIdentity)
const plan=createRecomputePlan(request,snapshot,impact,at)
assert.deepEqual(plan.steps.map(step=>step.ruleNodeId),[ruleA.nodeId,ruleB.nodeId])
assert(plan.skippedNodeIds.length===0)
assert.equal(plan.steps[1]!.dependencyStepIds[0],plan.steps[0]!.stepId)
assert.equal(reconcileDependency(snapshot,plan).consistent,true)

const noImpact=analyzeImpact({changedNode:result,replacedNodeId:null,reason:"DEPENDENCY_CHANGED",snapshot,maxDepth:10,requestedAt:at})
assert.equal(createRecomputePlan(createRecomputeRequest(noImpact,{eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,recomputePolicyVersion:"1",targetResultIds:[],createdAt:at}),snapshot,noImpact,at).steps.length,0)

const r1=createImmutableConsistencyResult(createResultFixture({inputs:[temporalFact("result-a","left",1),temporalFact("result-b","right",1)]}))
const r2=createImmutableConsistencyResult(createResultFixture({inputs:[temporalFact("result-a","left",2,"2026-02-02T00:00:00.000Z"),temporalFact("result-b","right",1)],knowledgeMode:"LATEST_CORRECTED",cutoff:"2026-02-02T01:00:00.000Z"}))
const historic=selectConsistencyResult({candidates:[r2,r1].map(result=>({subjectId:"bounded-subject",result})),subjectId:"bounded-subject",eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,policyVersion:"1",knowledgeMode:"AS_KNOWN_THEN",knowledgeTimeCutoff:RESULT_FIXTURE_CUTOFF,preferredRuleVersion:"1.0.0",supersededResultIds:[],createdAt:at})
assert.equal(historic.selectedResultId,r1.resultId)
const current=selectConsistencyResult({candidates:[r1,r2].map(result=>({subjectId:"bounded-subject",result})),subjectId:"bounded-subject",eventTimeStart:RESULT_FIXTURE_START,eventTimeEnd:RESULT_FIXTURE_END,policyVersion:"1",knowledgeMode:"LATEST_CORRECTED",knowledgeTimeCutoff:"2026-02-02T01:00:00.000Z",preferredRuleVersion:"1.0.0",supersededResultIds:[r1.resultId],createdAt:at})
assert.equal(current.selectedResultId,r2.resultId)

console.log("D4 Phase 2C dependency unit suite passed")
