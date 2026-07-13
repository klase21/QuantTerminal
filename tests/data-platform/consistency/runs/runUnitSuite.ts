import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createConsistencyInputSetIdentity, createConsistencyRunEventId, createConsistencyRunSpecification, isLegalRunLifecycleTransition, isTerminalRunLifecycleState, reconcileConsistencyRun, type ConsistencyRunEvent, type ConsistencyRunRecord } from "@/lib/data-platform/consistency"
const governance={datasetRegistrySnapshotId:"ds",providerRegistrySnapshotId:"ps",providerCertificationSnapshotId:"pcs",policyVersionId:"policy",schemaVersion:"1",normalizationVersion:"1"}
const fact={datasetId:"funding",businessIdentity:"b",canonicalRecordId:"r",recordVersion:1,factTable:"FUNDING"} as const
const input={roleId:"fact",fact,physicalFactId:"p",datasetId:"funding",providerId:"provider",effectiveAt:null,observedAt:"2026-01-01T00:00:00Z",knowledgeAvailableAt:"2026-01-01T00:01:00Z",publicationState:"PUBLISHED",checksum:"a".repeat(64),governance,lineageNodeId:"l"} as const
const policies={temporalPolicyId:"temporal",temporalPolicyVersion:"1",comparisonPolicyReferences:[{policyId:"comparison",policyVersion:"1"}],severityPolicyId:"severity",severityPolicyVersion:"1",retryPolicyReference:null} as const
const base={ruleSetId:"core",ruleSetVersion:"1.0.0",subjectId:"BTCUSDT",eventTimeStart:"2026-01-01T00:00:00Z",eventTimeEnd:"2026-01-01T01:00:00Z",knowledgeMode:"AS_KNOWN_THEN" as const,knowledgeTimeCutoff:"2026-01-01T01:01:00Z",orderedInputs:[input],ruleRegistryChecksum:"b".repeat(64),policyBindings:policies,executionProfile:"bounded",createdAt:"2026-01-01T01:02:00Z"}
const spec=createConsistencyRunSpecification(base)
const checks:Array<[string,boolean]>=[];const check=(n:string,p:boolean)=>checks.push([n,p])
check("identity deterministic",spec.runId===createConsistencyRunSpecification(base).runId)
check("input order independent",createConsistencyInputSetIdentity([input,{...input,roleId:"other",fact:{...fact,canonicalRecordId:"r2"}}])===createConsistencyInputSetIdentity([{...input,roleId:"other",fact:{...fact,canonicalRecordId:"r2"}},input]))
check("ruleset version identity defining",spec.runId!==createConsistencyRunSpecification({...base,ruleSetVersion:"2.0.0"}).runId)
check("knowledge cutoff identity defining",spec.runId!==createConsistencyRunSpecification({...base,knowledgeTimeCutoff:"2026-01-01T01:02:00Z"}).runId)
check("event window identity defining",spec.runId!==createConsistencyRunSpecification({...base,eventTimeEnd:"2026-01-01T02:00:00Z"}).runId)
check("execution timestamps excluded",spec.runId===createConsistencyRunSpecification({...base,createdAt:"2026-01-02T00:00:00Z"}).runId)
check("closed legal transitions",isLegalRunLifecycleTransition("PENDING","RUNNING")&&isLegalRunLifecycleTransition("RUNNING","COMPLETED")&&isLegalRunLifecycleTransition("RUNNING","PARTIAL"))
check("terminal states enforced",isTerminalRunLifecycleState("COMPLETED")&&!isLegalRunLifecycleTransition("FAILED","COMPLETED")&&!isLegalRunLifecycleTransition("CANCELLED","RUNNING"))
check("event identity deterministic",createConsistencyRunEventId({commandId:"start",runId:spec.runId,eventType:"RUN_STARTED",previousState:"PENDING",nextState:"RUNNING",specificationChecksum:spec.specificationChecksum})===createConsistencyRunEventId({commandId:"start",runId:spec.runId,eventType:"RUN_STARTED",previousState:"PENDING",nextState:"RUNNING",specificationChecksum:spec.specificationChecksum}))
const event:ConsistencyRunEvent={eventId:"e",runId:spec.runId,attemptId:null,eventSequence:1,eventType:"RUN_CREATED",previousState:null,nextState:"PENDING",actorType:"COORDINATOR",actorId:"a",occurredAt:base.createdAt,policyVersionReferences:[],reasonCodes:[],details:[],eventChecksum:"c".repeat(64)}
const run:ConsistencyRunRecord={specification:spec,currentState:"PENDING",lastEventSequence:1,startedAt:null,terminalAt:null,completionSummary:null}
check("reconciliation consistent",reconcileConsistencyRun(run,[event]).consistent)
check("reconciliation detects state mismatch",reconcileConsistencyRun({...run,currentState:"RUNNING"},[event]).reasonCodes.includes("CURRENT_STATE_MISMATCH"))
check("specification checksum immutable",spec.specificationChecksum===canonicalChecksum({ruleSetId:spec.ruleSetId,ruleSetVersion:spec.ruleSetVersion,subjectId:spec.subjectId,eventTimeStart:spec.eventTimeStart,eventTimeEnd:spec.eventTimeEnd,knowledgeMode:spec.knowledgeMode,knowledgeTimeCutoff:spec.knowledgeTimeCutoff,inputSetIdentity:spec.inputSetIdentity,policyBindings:spec.policyBindings,executionProfile:spec.executionProfile,runId:spec.runId,ruleRegistryChecksum:spec.ruleRegistryChecksum}))
const failures=checks.filter(([,p])=>!p);console.log("D4 PHASE 2 PART 03 UNIT SUITE: "+(failures.length?"FAIL":"PASS"));for(const[n,p]of checks)console.log("["+(p?"PASS":"FAIL")+"] "+n);if(failures.length)process.exitCode=1
