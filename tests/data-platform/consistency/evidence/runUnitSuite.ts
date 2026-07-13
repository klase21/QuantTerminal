import { assembleCoreEvidencePacket,createEvidenceBusinessIdentity,normalizeEvidenceCandidates,reconcileCoreEvidencePacket } from "@/lib/data-platform/evidence-platform"
import { evidenceRequest } from "./fixtures"

const checks:Array<[string,boolean]>=[],check=(name:string,pass:boolean)=>checks.push([name,pass])
const base=evidenceRequest(),packet=assembleCoreEvidencePacket(base),reordered=assembleCoreEvidencePacket({...base,selections:[...base.selections].reverse()}),mixed=assembleCoreEvidencePacket(evidenceRequest({includeConflict:true})),v2=assembleCoreEvidencePacket(evidenceRequest({version:2})),profileV2=assembleCoreEvidencePacket(evidenceRequest({profileVersion:"2.0.0"}))
check("Candidate identity deterministic",normalizeEvidenceCandidates(base)[0]!.candidateIdentity===normalizeEvidenceCandidates(base)[0]!.candidateIdentity)
check("business identity deterministic",createEvidenceBusinessIdentity(base).evidenceBusinessIdentity===packet.evidenceBusinessIdentity)
check("Candidate order independent",packet.packetVersionIdentity===reordered.packetVersionIdentity&&packet.packetChecksum===reordered.packetChecksum)
check("exact Result retained",packet.resultReferences[0]?.resultIdentity===base.selections[0]?.result.resultIdentity)
check("exact Fact versions retained",packet.factReferences.some(f=>f.canonicalRecordId==="evidence-a"&&f.recordVersion===1))
check("supporting and conflicting separate",mixed.supportingEvidence.length===1&&mixed.conflictingEvidence.length===1&&mixed.conclusionCode==="EVIDENCE_MIXED")
const requirements=assembleCoreEvidencePacket({...base,selections:[],requirements:[{requirementId:"m",kind:"MISSING",datasetId:"funding",reasonCode:"NOT_FOUND",policyId:"p",policyVersion:"1"},{requirementId:"u",kind:"UNSUPPORTED",datasetId:"macro",reasonCode:"CAPABILITY_ABSENT",policyId:"p",policyVersion:"1"},{requirementId:"i",kind:"INAPPLICABLE",datasetId:null,reasonCode:"SUBJECT_INAPPLICABLE",policyId:"p",policyVersion:"1"}]})
check("missing unsupported inapplicable separate",requirements.missingEvidence.length===1&&requirements.unsupportedEvidence.length===1&&requirements.inapplicableEvidence.length===1)
check("correction changes Packet version",packet.evidenceBusinessIdentity===v2.evidenceBusinessIdentity&&packet.packetVersionIdentity!==v2.packetVersionIdentity&&packet.factReferences[0]?.recordVersion!==v2.factReferences[0]?.recordVersion)
check("profile drift changes identity",packet.evidenceBusinessIdentity!==profileV2.evidenceBusinessIdentity&&packet.packetVersionIdentity!==profileV2.packetVersionIdentity)
let mixedMode=false;try{assembleCoreEvidencePacket({...base,timeScope:{...base.timeScope,knowledgeMode:"RETROSPECTIVE"}})}catch{mixedMode=true}check("mixed Knowledge mode rejected",mixedMode)
let future=false;try{const original=base.selections[0]!.result,result={...original,inputs:original.inputs.map((input,index)=>index?input:{...input,knowledgeAvailableAt:"2026-02-01T02:00:00.000Z"})};assembleCoreEvidencePacket({...base,selections:[{result,dependencySnapshotId:null}]})}catch{future=true}check("future knowledge blocked",future)
check("no generated prose field",!("explanation" in packet)&&!("narrative" in packet))
check("reconciliation passes",reconcileCoreEvidencePacket(packet,base).consistent)
check("reconciliation detects mutation",!reconcileCoreEvidencePacket({...packet,packetChecksum:"f".repeat(64)},base).consistent)
const failures=checks.filter(([,pass])=>!pass);console.log(`D4 PHASE 3A UNIT SUITE: ${failures.length?"FAIL":"PASS"}`);for(const[name,pass]of checks)console.log(`[${pass?"PASS":"FAIL"}] ${name}`);if(failures.length)process.exitCode=1
