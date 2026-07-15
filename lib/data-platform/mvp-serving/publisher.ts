import { readFile, writeFile, mkdir } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { ConsistencyPostgresRuntime, MvpProjectionReadPort, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"
import { MVP_PROJECTION_DEFINITIONS, verifyMvpProjection, type MvpProjectionKind, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type { ConsumerProjection } from "@/lib/data-platform/consumer-projections"
import { materializeMvpReplaySequence } from "@/lib/replay-sequence"
import { createReleaseInventoryItem, createServingCorpus, createServingDemoProfile, createServingEvidenceSummary, createServingReplaySnapshot, type MvpServingPublication, type ServingReleaseInventoryItem } from "./contracts"

const CORPUS_PATH = path.join(process.cwd(), "docs", "project", "mvp-projection-corpus.json")
const DEMO_PATH = path.join(process.cwd(), "docs", "project", "mvp-default-demo-event.json")
export const FALLBACK_PATH = path.join(process.cwd(), "lib", "data-platform", "mvp-serving", "generated", "certifiedSnapshot.json")

interface CorpusManifest { readonly projectionCorpusId: string; readonly projectionCorpusChecksum: string; readonly basis: Readonly<Record<string, unknown>> }
interface DemoManifest { readonly profileId: string; readonly primary: Readonly<Record<string, unknown>>; readonly backup: Readonly<Record<string, unknown>>; readonly profileChecksum: string }

function d4Environment(): D4Environment { return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL } }
function d4Runtime() { const environment=d4Environment(); if(!environment.D4_ISOLATED_POSTGRES_URL)throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED_FOR_PUBLICATION"); return new ConsistencyPostgresRuntime({ connectionString:environment.D4_ISOLATED_POSTGRES_URL,roleIntent:"READ_ONLY",maxConnections:1,connectTimeoutSeconds:10,idleTimeoutSeconds:30,statementTimeoutMs:30_000,applicationName:"mvp-serving-publisher-source",environment }) }

export async function buildMvpServingPublication(progress: (message: string) => void = () => undefined): Promise<MvpServingPublication> {
  const manifest = JSON.parse(await readFile(CORPUS_PATH, "utf8")) as CorpusManifest
  if (canonicalChecksum(manifest.basis) !== manifest.projectionCorpusChecksum || manifest.projectionCorpusId !== `mvp-projection-corpus:${manifest.projectionCorpusChecksum}`) throw new Error("MVP_SERVING_SOURCE_CORPUS_CHECKSUM_MISMATCH")
  const demo = JSON.parse(await readFile(DEMO_PATH, "utf8")) as DemoManifest
  const runtime=d4Runtime(); await runtime.connect()
  try {
    const port=new MvpProjectionReadPort(runtime), base: MvpProjectionVersion[]=[]
    for(const definition of MVP_PROJECTION_DEFINITIONS) for(let offset=0;;offset+=100){const page=await port.list({kind:definition.projectionKind,exposure:"READY_FOR_CUTOVER",limit:100,offset});base.push(...page);if(page.length<100)break}
    if(base.length!==868 || base.some((value)=>!verifyMvpProjection(value)))throw new Error(`MVP_SERVING_BASE_PROJECTION_INVENTORY_INVALID:${base.length}`)
    const conflicts=await runtime.sql.unsafe<Array<{existing_projection_version_id:string}>>("SELECT existing_projection_version_id FROM projection.mvp_projection_conflicts WHERE reason_code='IMMUTABLE_PROJECTION_CONTENT_MISMATCH'")
    const supplementalRows=await runtime.sql.unsafe<Array<{projection_version_id:string;projection_kind:string;subject_id:string;projection_checksum:string;lifecycle_state:string;consumer_exposure_state:string;supersedes_projection_version_id:string|null}>>("SELECT projection_version_id,projection_kind,subject_id,projection_checksum,lifecycle_state,consumer_exposure_state,supersedes_projection_version_id FROM projection.mvp_projection_versions WHERE projection_kind=ANY($1) AND consumer_exposure_state='READY_FOR_CUTOVER' ORDER BY projection_version_id", [["MacroContextProjection","BitcoinEtfFlowProjection"]])
    if(supplementalRows.length!==3)throw new Error(`MVP_SERVING_SUPPLEMENTAL_INVENTORY_INVALID:${supplementalRows.length}`)
    const conflicted=new Set(conflicts.map((value)=>value.existing_projection_version_id)), successors=new Set(supplementalRows.map((value)=>value.supersedes_projection_version_id).filter((value):value is string=>Boolean(value)))
    const inventory: ServingReleaseInventoryItem[]=supplementalRows.map((value)=>{
      const excluded=conflicted.has(value.projection_version_id)&&successors.has(value.projection_version_id)
      return createReleaseInventoryItem({sourceProjectionVersionId:value.projection_version_id,projectionKind:value.projection_kind,subjectId:value.subject_id,sourceChecksum:value.projection_checksum,checksumValid:!excluded,lifecycle:value.lifecycle_state,exposure:value.consumer_exposure_state,supersessionIdentity:value.supersedes_projection_version_id,eligibility:excluded?"INELIGIBLE":"ELIGIBLE",disposition:excluded?"EXCLUDED":"INCLUDED",dispositionReason:excluded?"EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT":"RELEASE_ELIGIBLE"})
    })
    const eligibleSupplemental: MvpProjectionVersion[]=[]
    for(const item of inventory.filter((value)=>value.disposition==="INCLUDED")){const value=await port.byVersion(item.sourceProjectionVersionId);if(!value||!verifyMvpProjection(value))throw new Error(`MVP_SERVING_ELIGIBLE_SUPPLEMENTAL_INVALID:${item.sourceProjectionVersionId}`);eligibleSupplemental.push(value)}
    const groups=new Map<string,number>();for(const value of eligibleSupplemental){const key=`${value.projectionKind}:${value.subjectId}`;groups.set(key,(groups.get(key)??0)+1)}
    if([...groups.values()].some((count)=>count!==1)||eligibleSupplemental.length!==2)throw new Error("MVP_SERVING_MULTIPLE_ELIGIBLE_SUPPLEMENTAL_CONFLICT")
    const projections=Object.freeze([...base,...eligibleSupplemental].sort((a,b)=>a.projectionVersionId.localeCompare(b.projectionVersionId)))
    const evidenceSummaries=Object.freeze(base.filter((value)=>value.projectionKind==="ResearchEvidenceProjection").map(createServingEvidenceSummary).sort((a,b)=>a.evidenceSummaryId.localeCompare(b.evidenceSummaryId)))
    if(evidenceSummaries.length!==84)throw new Error("MVP_SERVING_EVIDENCE_SUMMARY_COUNT_INVALID")
    const replaySources=base.filter((value)=>value.projectionKind==="ReplayTimelineProjection").sort((a,b)=>a.eventTimeStart.localeCompare(b.eventTimeStart)||a.subjectId.localeCompare(b.subjectId))
    if(replaySources.length!==84)throw new Error("MVP_SERVING_REPLAY_SOURCE_COUNT_INVALID")
    const replaySnapshots=[]
    for(let index=0;index<replaySources.length;index+=1){const source=replaySources[index]!,model=await materializeMvpReplaySequence(toConsumerProjection(source));replaySnapshots.push(createServingReplaySnapshot(source,model));if((index+1)%12===0)progress(`REPLAY ${index+1}/84`)}
    const demoProfiles=Object.freeze([createServingDemoProfile("PRIMARY",Object.freeze({...demo.primary,profileId:`${demo.profileId}:PRIMARY`})),createServingDemoProfile("BACKUP",Object.freeze({...demo.backup,profileId:`${demo.profileId}:BACKUP`}))])
    for(const profile of demoProfiles){if(!projections.some((value)=>value.projectionVersionId===profile.replayIdentity)||!projections.some((value)=>value.projectionVersionId===profile.researchIdentity)||!evidenceSummaries.some((value)=>value.evidencePacketId===profile.evidenceIdentity))throw new Error(`MVP_SERVING_DEMO_PROFILE_DEPENDENCY_MISSING:${profile.role}`)}
    const generatedAt=projections.map((value)=>value.knowledgeTimeCutoff).sort().at(-1)!, governedThrough=projections.map((value)=>value.eventTimeEnd).sort().at(-1)!
    const releaseDigest=canonicalChecksum({projections:projections.map((value)=>[value.projectionVersionId,value.projectionChecksum]),evidence:evidenceSummaries.map((value)=>[value.evidenceSummaryId,value.summaryChecksum]),replay:replaySnapshots.map((value)=>[value.replaySnapshotId,value.snapshotChecksum]),profiles:demoProfiles.map((value)=>[value.profileId,value.profileChecksum]),inventory:inventory.map((value)=>[value.inventoryId,value.disposition])})
    const corpus=createServingCorpus({corpusVersion:"1.0.0",sourceCorpusId:manifest.projectionCorpusId,sourceCorpusChecksum:manifest.projectionCorpusChecksum,generatedAt,governedThrough,projectionCount:projections.length,evidenceSummaryCount:evidenceSummaries.length,replaySnapshotCount:replaySnapshots.length,demoProfileCount:demoProfiles.length,releaseInventoryCount:inventory.length,publicationEventCount:1,releaseDigest})
    return Object.freeze({corpus,projections,evidenceSummaries,replaySnapshots:Object.freeze(replaySnapshots),demoProfiles,releaseInventory:Object.freeze(inventory.sort((a,b)=>a.sourceProjectionVersionId.localeCompare(b.sourceProjectionVersionId)))})
  } finally { await runtime.shutdown() }
}

export async function writeCertifiedSnapshotBundle(publication: MvpServingPublication): Promise<{readonly path:string;readonly bytes:number;readonly checksum:string;readonly projectionCount:number}> {
  const wanted=new Set<string>(), byId=new Map(publication.projections.map((value)=>[value.projectionVersionId,value]))
  const latest=(kind:MvpProjectionKind,subject:string)=>publication.projections.filter((value)=>value.projectionKind===kind&&value.subjectId===subject&&!publication.projections.some((successor)=>successor.supersedesProjectionVersionId===value.projectionVersionId)).sort((a,b)=>b.eventTimeEnd.localeCompare(a.eventTimeEnd)||b.createdAt.localeCompare(a.createdAt))[0]
  const instruments=["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","DOGEUSDT"]
  for(const value of [latest("DashboardMarketStateProjection","MVP_SIX_INSTRUMENTS"),latest("ScannerCandidateProjection","MVP_SIX_INSTRUMENTS"),latest("MacroContextProjection","GLOBAL_MACRO_CONTEXT"),latest("BitcoinEtfFlowProjection","BTC_SPOT_ETF_US")])if(value)wanted.add(value.projectionVersionId)
  for(const instrument of instruments){for(const kind of ["InstrumentMarketSummaryProjection","SourceLineageSummaryProjection","EventAnnotationProjection","ResearchEvidenceProjection"] as const){const value=latest(kind,instrument);if(value)wanted.add(value.projectionVersionId)}for(const dataset of ["ohlcv","funding","openInterest","aggTrades"]){const value=latest("CoverageDataStatusProjection",`${instrument}:${dataset}`);if(value)wanted.add(value.projectionVersionId)}}
  const trade=latest("TradeDecisionContextProjection","BTCUSDT");if(trade)wanted.add(trade.projectionVersionId)
  for(const profile of publication.demoProfiles){wanted.add(profile.replayIdentity);wanted.add(profile.researchIdentity);const source=byId.get(profile.replayIdentity);const annotation=source?publication.projections.find((value)=>value.projectionKind==="EventAnnotationProjection"&&value.subjectId===profile.instrument&&value.eventTimeStart===source.eventTimeStart):null;if(annotation)wanted.add(annotation.projectionVersionId)}
  const projections=publication.projections.filter((value)=>wanted.has(value.projectionVersionId)), packetIds=new Set(publication.demoProfiles.map((value)=>value.evidenceIdentity)), replayIds=new Set(publication.demoProfiles.map((value)=>value.replayIdentity))
  const base={schemaVersion:"mvp-certified-serving-snapshot/1.0.0",dataMode:"CERTIFIED_SNAPSHOT",governedThrough:publication.corpus.governedThrough,corpus:publication.corpus,exposure:{state:"CONSUMER_VISIBLE",source:"MVP7A_LOCAL_CERTIFIED_PUBLICATION"},projections,evidenceSummaries:publication.evidenceSummaries.filter((value)=>packetIds.has(value.evidencePacketId)),replaySnapshots:publication.replaySnapshots.filter((value)=>replayIds.has(value.sourceProjectionVersionId)),demoProfiles:publication.demoProfiles}
  const bundle=Object.freeze({...base,bundleChecksum:canonicalChecksum(base)})
  await mkdir(path.dirname(FALLBACK_PATH),{recursive:true});const output=`${JSON.stringify(bundle,null,2)}\n`;await writeFile(FALLBACK_PATH,output,"utf8")
  return Object.freeze({path:FALLBACK_PATH,bytes:Buffer.byteLength(output),checksum:bundle.bundleChecksum,projectionCount:projections.length})
}

function toConsumerProjection(value:MvpProjectionVersion):ConsumerProjection{return Object.freeze({projectionId:value.projectionId,projectionVersionId:value.projectionVersionId,projectionKind:value.projectionKind,subjectId:value.subjectId,eventTimeStart:value.eventTimeStart,eventTimeEnd:value.eventTimeEnd,knowledgeTimeCutoff:value.knowledgeTimeCutoff,payload:value.structuredPayload,completeness:value.completeness,limitations:value.limitations,lifecycleState:value.lifecycleState,effectiveExposure:"CONSUMER_VISIBLE",projectionChecksum:value.projectionChecksum})}
