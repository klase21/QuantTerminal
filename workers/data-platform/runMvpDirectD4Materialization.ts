import { readFileSync } from "node:fs"
import postgres from "postgres"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { MVP_EVIDENCE_POLICY, readMvpEvidenceWindows, persistMvpEvidenceWindow, seedMvpEvidenceGovernance, type MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import { ConsistencyMigrationRunner, ConsistencyPostgresRuntime, createMvpBoundedCoverageResult, D2DependencyBootstrapRunner, loadMvpProjectionEvidenceInputs, MvpCoverageStore, MvpProjectionStore, persistBoundedMvpProjections, persistMvpProjectionBatch, seedMvpProjectionDefinitions } from "@/lib/data-platform/consistency-evidence/postgres"
import { MVP_PROJECTION_DEFINITIONS, assertMvpProjectionKindsForScope, generateMvpProjectionCorpus, projectionKindsForScope, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type { ConsumerProjection } from "@/lib/data-platform/consumer-projections"
import { materializeMvpReplaySequenceFromCore } from "@/lib/replay-sequence"
import { MvpRefreshMigrationRunner } from "@/lib/data-platform/mvp-refresh/migrationRunner"
import { MvpRefreshPostgresClient } from "@/lib/data-platform/mvp-refresh/client"
import { MvpRefreshStore } from "@/lib/data-platform/mvp-refresh/store"
import { MvpServingMigrationRunner } from "@/lib/data-platform/mvp-serving/migrationRunner"
import { createServingEvidenceSummary, createServingReplaySnapshot, MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION, MvpServingPostgresClient, publishInactiveCandidateToSeparateTarget } from "@/lib/data-platform/mvp-serving"

const START = process.env.MVP_BLUE_GREEN_WINDOW_START ?? "2026-07-15T00:00:00.000Z", END = process.env.MVP_BLUE_GREEN_WINDOW_END ?? "2026-07-16T00:00:00.000Z"
const INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])
const DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"])

function bindings() { const path = process.env.MVP8E_META_PATH ?? process.env.MVP8C_META_PATH; if (!path) throw new Error("MVP8E_META_PATH_REQUIRED"); return Object.fromEntries(readFileSync(path, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map((line) => { const at=line.indexOf("="); return [line.slice(0,at),line.slice(at+1)] })) as Record<string,string> }
function d4Environment(value: Record<string,string>) { return { MVP_BLUE_GREEN_RELEASE_MODE:value.MVP_BLUE_GREEN_RELEASE_MODE,D4_ISOLATED_POSTGRES_URL:value.D4_URL,D4_EXPECTED_DATABASE_NAME:value.D4_DB,D2_CANONICAL_POSTGRES_URL:value.CORE_URL,MVP_REFRESH_ISOLATED_POSTGRES_URL:value.REFRESH_URL,MVP_SERVING_ISOLATED_POSTGRES_URL:value.SERVING_OWNER_URL } }
function runtime(value:Record<string,string>,roleIntent:"MIGRATION_OWNER"|"CONSISTENCY_WORKER"|"EVIDENCE_ASSEMBLER"|"PROJECTION_BUILDER",name:string){return new ConsistencyPostgresRuntime({connectionString:value.D4_URL,roleIntent,maxConnections:1,connectTimeoutSeconds:10,idleTimeoutSeconds:30,statementTimeoutMs:30_000,applicationName:name,environment:d4Environment(value)})}
function refreshClient(value:Record<string,string>){return new MvpRefreshPostgresClient(value.REFRESH_URL,{MVP_BLUE_GREEN_RELEASE_MODE:value.MVP_BLUE_GREEN_RELEASE_MODE,MVP_BLUE_GREEN_TARGET_ID:value.MVP_BLUE_GREEN_REFRESH_TARGET_ID},{database:value.REFRESH_DB,role:value.REFRESH_ROLE})}
function servingClient(value:Record<string,string>,intent:"MIGRATION_OWNER"|"PUBLISHER"|"READER"){
  const key = intent === "MIGRATION_OWNER" ? "SERVING_OWNER_URL" : intent === "PUBLISHER" ? "SERVING_PUBLISHER_URL" : "SERVING_READER_URL"
  const roleKey = intent === "MIGRATION_OWNER" ? "SERVING_OWNER_ROLE" : intent === "PUBLISHER" ? "SERVING_PUBLISHER_ROLE" : "SERVING_READER_ROLE"
  return new MvpServingPostgresClient(value[key],intent,{},"MANAGED_POSTGRES",{database:value.SERVING_DB,role:value[roleKey]})
}
function corpus(windows:readonly MvpEvidenceWindowData[]){const basis=windows.map((window)=>[window.measurement.instrument,window.measurement.sourceReferenceDigest,window.committedInputs.map((input)=>input.commitId)]);const checksum=canonicalChecksum(basis);return Object.freeze({corpusId:`mvp8d-core:${checksum}`,corpusChecksum:checksum})}
function committed(window:MvpEvidenceWindowData){return Object.freeze(window.committedInputs.map((value)=>Object.freeze({identity:value.commitId,checksum:value.checksum})))}
function consumer(value:MvpProjectionVersion):ConsumerProjection{return Object.freeze({projectionId:value.projectionId,projectionVersionId:value.projectionVersionId,projectionKind:value.projectionKind,subjectId:value.subjectId,eventTimeStart:value.eventTimeStart,eventTimeEnd:value.eventTimeEnd,knowledgeTimeCutoff:value.knowledgeTimeCutoff,payload:value.structuredPayload,completeness:value.completeness,limitations:value.limitations,lifecycleState:value.lifecycleState,effectiveExposure:"CONSUMER_VISIBLE",projectionChecksum:value.projectionChecksum})}

async function openCore(value:Record<string,string>){const sql=postgres(value.CORE_URL,{max:1,prepare:false,connection:{application_name:"mvp8d-core-read-only",default_transaction_read_only:true}}),readOnly=await sql.unsafe<Array<{value:string}>>("SELECT current_setting('transaction_read_only') value");if(readOnly[0]?.value!=="on"){await sql.end({timeout:5});throw new Error("MVP8D_CORE_NOT_READ_ONLY")}return Object.freeze({sql,close:()=>sql.end({timeout:5})})}

async function verifyCore(core: Awaited<ReturnType<typeof openCore>>) {
  const rows = await core.sql.unsafe<Array<{
    ohlcv: string
    openInterest: string
    funding: string
    manifests: string
    commits: string
    candidates: string
    objects: string
    conflicts: string
  }>>(`
    SELECT
      (SELECT count(*)::text FROM canonical.ohlcv WHERE open_time >= $1 AND open_time < $2) AS "ohlcv",
      (SELECT count(*)::text FROM canonical.open_interest WHERE observed_at >= $1 AND observed_at < $2) AS "openInterest",
      (SELECT count(*)::text FROM canonical.funding WHERE funding_time >= $1 AND funding_time < $2) AS "funding",
      (SELECT count(*)::text FROM canonical.stream_manifests WHERE source_dataset_id = 'agg-trade' AND validation_status = 'VALIDATED' AND window_start = $1 AND window_end = $2) AS "manifests",
      (SELECT count(*)::text FROM control.canonical_commits c WHERE EXISTS (SELECT 1 FROM canonical.ohlcv o WHERE o.commit_id=c.commit_id AND o.open_time >= $1 AND o.open_time < $2) OR EXISTS (SELECT 1 FROM canonical.open_interest oi WHERE oi.commit_id=c.commit_id AND oi.observed_at >= $1 AND oi.observed_at < $2) OR EXISTS (SELECT 1 FROM canonical.funding f WHERE f.commit_id=c.commit_id AND f.funding_time >= $1 AND f.funding_time < $2) OR EXISTS (SELECT 1 FROM canonical.stream_manifests s WHERE s.commit_id=c.commit_id AND s.window_start=$1 AND s.window_end=$2)) AS "commits",
      (SELECT count(*)::text FROM population.candidates WHERE source_observed_at >= $1 AND source_observed_at < $2) AS "candidates",
      (SELECT count(*)::text FROM raw.objects WHERE window_start=$1 AND window_end=$2) AS "objects",
      (SELECT count(*)::text FROM population.candidate_conflicts) AS "conflicts"
  `, [START, END])
  const actual = rows[0]
  const expected = {
    ohlcv: "1728",
    openInterest: "1728",
    funding: "18",
    manifests: "6",
    commits: "3480",
    candidates: "3480",
    objects: "24",
    conflicts: "0",
  }
  if (!actual || Object.entries(expected).some(([key, value]) => actual[key as keyof typeof actual] !== value)) {
    throw new Error("MVP8E_CORE_VERIFICATION_FAILED")
  }
  return Object.freeze(expected)
}

async function migrate(value:Record<string,string>){const d4=runtime(value,"MIGRATION_OWNER","mvp8e-d4-migration"),refresh=refreshClient(value),serving=servingClient(value,"MIGRATION_OWNER");try{await Promise.all([d4.connect(),refresh.verify(),serving.verify()]);const dependencies=await new D2DependencyBootstrapRunner(d4).apply("mvp8e-direct-materialization"),d4Migrations=await new ConsistencyMigrationRunner(d4).apply("mvp8e-direct-materialization"),refreshMigrations=await new MvpRefreshMigrationRunner(refresh).apply("mvp8e-direct-materialization"),servingMigrations=await new MvpServingMigrationRunner(serving).apply("mvp8e-direct-materialization");const failed=[...dependencies.filter((item)=>item.status==="FAILED").map((item)=>`dependency:${item.sequence}`),...d4Migrations.filter((item)=>item.status==="FAILED").map((item)=>`d4:${item.migrationId}`),...refreshMigrations.filter((item)=>item.status==="FAILED").map((item)=>`refresh:${item.migrationId}`),...servingMigrations.filter((item)=>item.status==="FAILED").map((item)=>`serving:${item.migrationId}`)];if(failed.length)throw new Error(`MVP8E_MIGRATION_FAILED:${failed.join(",")}`);const evidenceGovernance=await seedMvpEvidenceGovernance(d4);await seedMvpProjectionDefinitions(d4,MVP_PROJECTION_DEFINITIONS);process.stdout.write(JSON.stringify({status:"MIGRATED",dependencies:dependencies.length,d4:d4Migrations.length,refresh:refreshMigrations.length,serving:servingMigrations.length,evidenceGovernance}))}finally{await Promise.allSettled([d4.shutdown(),refresh.shutdown(),serving.shutdown()])}}

async function materializeWindows(value:Record<string,string>,instruments:readonly string[],mode:"CANARY"|"FULL") { const core=await openCore(value),consistency=runtime(value,"CONSISTENCY_WORKER",`mvp8e-${mode.toLowerCase()}-consistency`),evidence=runtime(value,"EVIDENCE_ASSEMBLER",`mvp8e-${mode.toLowerCase()}-evidence`),projection=runtime(value,"PROJECTION_BUILDER",`mvp8e-${mode.toLowerCase()}-projection`),refresh=refreshClient(value);try{await verifyCore(core);await Promise.all([consistency.connect(),evidence.connect(),projection.connect(),refresh.verify()]);const windows=await readMvpEvidenceWindows({d2:core,objectRoot:value.SOURCE_ROOT,eventTimeStart:START,eventTimeEnd:END,instruments}),sourceCorpus=corpus(windows),store=new MvpRefreshStore(refresh),coverageStore=new MvpCoverageStore(consistency),coverageResults=[];if(windows.length!==instruments.length||windows.some((window)=>window.measurement.completeness!=="COMPLETE"))throw new Error("MVP8E_COVERAGE_INCOMPLETE");for(const window of windows)for(const dataset of DATASETS){const commits=window.coverageInputs.filter((item)=>item.datasetId===dataset),venues=[...new Set(commits.map((item)=>item.venue))];if(venues.length!==1)throw new Error("MVP8E_COVERAGE_VENUE_MISMATCH");const coverage=createMvpBoundedCoverageResult({datasetId:dataset,venue:venues[0]!,subject:window.measurement.instrument,windowStart:START,windowEnd:END,sourceWatermark:END,policyVersionId:MVP_EVIDENCE_POLICY.activation,commits,computedAt:END}),persisted=await coverageStore.persist({canonical:core,result:coverage}),read=await coverageStore.readBounded({datasetId:dataset,venue:venues[0]!,subject:window.measurement.instrument,windowStart:START,windowEnd:END});if(!read||read.coverageVersionId!==persisted.result.coverageVersionId||read.coverageChecksum!==persisted.result.coverageChecksum)throw new Error("MVP8E_COVERAGE_READBACK_FAILED");coverageResults.push(persisted);await store.appendEvent(null,"mvp8e_coverage",persisted.result.coverageVersionId,"BOUNDED_COVERAGE_PERSISTED",null,"COMPLETE",{instrument:window.measurement.instrument,dataset,start:START,end:END,coverageVersionId:persisted.result.coverageVersionId,coverageChecksum:persisted.result.coverageChecksum})}const evidenceResults=[];for(const window of windows){const result=await persistMvpEvidenceWindow({corpus:sourceCorpus,data:window,worker:consistency,assembler:evidence,contract:{instrument:window.measurement.instrument,eventTimeStart:START,eventTimeEnd:END,committedInputIdentities:committed(window),modelVersion:"mvp8e-bounded-evidence/1.0.0",modelChecksum:canonicalChecksum({model:"mvp8e-bounded-evidence/1.0.0"})}});if(result.status==="CONFLICT"||result.status==="INELIGIBLE"||!result.packet)throw new Error(`MVP8E_EVIDENCE_${result.status}`);evidenceResults.push(result)}const projectionInputs=await loadMvpProjectionEvidenceInputs({corpus:sourceCorpus,d4:evidence,d2:core,d3:core,objectRoot:value.SOURCE_ROOT,eventTimeStart:START,eventTimeEnd:END,instruments}),projectionStore=new MvpProjectionStore(projection),instrumentKinds=projectionKindsForScope("INSTRUMENT_SCOPED"),projections:MvpProjectionVersion[]=[];assertMvpProjectionKindsForScope(instrumentKinds,"INSTRUMENT_SCOPED");for(const input of projectionInputs){const result=await persistBoundedMvpProjections({evidence:input,store:projectionStore,request:{instrument:input.assessment.instrument,eventTimeStart:START,eventTimeEnd:END,evidenceIdentity:input.packetVersionId,evidenceChecksum:input.packetChecksum,requestedProjectionKinds:instrumentKinds,modelVersion:"mvp8e-bounded-projection/1.0.0",modelChecksum:canonicalChecksum(MVP_PROJECTION_DEFINITIONS),schemaVersion:"1.0.0"}});if(result.status==="CONFLICT"||result.status==="INELIGIBLE")throw new Error(`MVP8E_PROJECTION_${result.status}`);projections.push(...result.projections)}if(mode==="FULL"){const aggregateKinds=projectionKindsForScope("CROSS_DATASET_AGGREGATE"),generated=generateMvpProjectionCorpus(projectionInputs).filter((item)=>aggregateKinds.includes(item.projectionKind));assertMvpProjectionKindsForScope(aggregateKinds,"CROSS_DATASET_AGGREGATE");if(new Set(generated.map((item)=>item.projectionKind)).size!==aggregateKinds.length)throw new Error("MVP8E_AGGREGATE_PROJECTION_INELIGIBLE");const aggregate=await persistMvpProjectionBatch(projectionStore,generated);if(aggregate.status==="CONFLICT")throw new Error("MVP8E_AGGREGATE_PROJECTION_CONFLICT");projections.push(...aggregate.projections)}return Object.freeze({core,refresh,store,sourceCorpus,windows,coverageResults,evidenceResults,projections,close:async()=>Promise.allSettled([consistency.shutdown(),evidence.shutdown(),projection.shutdown(),refresh.shutdown(),core.close()])})}catch(error){await Promise.allSettled([consistency.shutdown(),evidence.shutdown(),projection.shutdown(),refresh.shutdown(),core.close()]);throw error}}

async function canary(value:Record<string,string>){const result=await materializeWindows(value,["SOLUSDT","BTCUSDT"],"CANARY");try{const sol=result.windows.find((window)=>window.measurement.instrument==="SOLUSDT")!,btc=result.windows.find((window)=>window.measurement.instrument==="BTCUSDT")!,solOi=sol.coverageInputs.filter((item)=>item.datasetId==="open-interest"),btcAgg=btc.coverageInputs.filter((item)=>item.datasetId==="agg-trade");if(solOi.length!==288||btcAgg.length!==1)throw new Error("MVP8D_CANARY_INPUT_COUNT_INVALID");const watermarks=await result.refresh.sql.unsafe<Array<{count:string}>>("SELECT count(*)::text count FROM refresh_control.refresh_event WHERE entity_kind LIKE '%watermark%'");if(Number(watermarks[0]?.count)!==0)throw new Error("MVP8D_CANARY_PREMATURE_WATERMARK");process.stdout.write(JSON.stringify({status:"PASS",solOpenInterest:solOi.length,btcAggTradesManifests:btcAgg.length,coverageDependencies:result.coverageResults.length,evidencePackets:result.evidenceResults.length,projections:result.projections.length,prematureWatermarks:0}))}finally{await result.close()}}

async function full(value: Record<string, string>) {
  if (Date.parse(END) - Date.parse(START) !== 86_400_000 || new Date(Date.parse(START)).toISOString() !== START || new Date(Date.parse(END)).toISOString() !== END) throw new Error("MVP_BLUE_GREEN_DAILY_WINDOW_REQUIRED")
  const result = await materializeWindows(value, INSTRUMENTS, "FULL");
  try {
    for (const dataset of DATASETS) {
      const inputs = result.windows.flatMap((window) =>
        window.committedInputs.filter((item) => item.datasetId === dataset),
      );
      await result.store.appendEvent(
        null,
        "mvp8e_dataset_watermark",
        `mvp8e-watermark:${dataset}:${END}`,
        "DATASET_WATERMARK_VALIDATED",
        null,
        "VALIDATED",
        {
          dataset,
          through: END,
          inputCommitIds: inputs.map((item) => item.commitId),
          checksum: canonicalChecksum(inputs),
        },
      );
    }

    const replaySources = result.projections.filter(
      (item) => item.projectionKind === "ReplayTimelineProjection",
    );
    const replays = [];
    for (const source of replaySources) {
      replays.push(
        await materializeMvpReplaySequenceFromCore({
          projection: consumer(source),
          core: result.core,
          objectRoot: value.SOURCE_ROOT,
        }),
      );
    }
    if (
      replays.length !== 6 ||
      replays.some(
        (item) =>
          item.sampleCounts.price !== 288 ||
          item.sampleCounts.openInterest !== 288 ||
          item.sampleCounts.funding !== 3 ||
          item.sampleCounts.flow !== 48,
      )
    ) {
      throw new Error("MVP8E_REPLAY_INVALID");
    }

    await result.store.appendEvent(
      null,
      "mvp8e_common_watermark",
      `mvp8e-common-watermark:${END}`,
      "COMMON_WATERMARK_VALIDATED",
      null,
      "VALIDATED",
      {
        through: END,
        datasets: DATASETS,
        replayChecksums: replays.map((item) => item.modelChecksum),
      },
    );

    const watermarkRows = await result.refresh.sql.unsafe<Array<{ event_id: string; checksum: string }>>("SELECT event_id,checksum FROM refresh_control.refresh_event WHERE entity_kind='mvp8e_common_watermark' AND entity_id=$1", [`mvp8e-common-watermark:${END}`])
    if (watermarkRows.length !== 1) throw new Error("MVP_BLUE_GREEN_COMMON_WATERMARK_READBACK_FAILED")
    const research = result.projections.filter((item) => item.projectionKind === "ResearchEvidenceProjection")
    const evidenceSummaries = research.map(createServingEvidenceSummary)
    const replayByProjection = new Map(result.projections.filter((item) => item.projectionKind === "ReplayTimelineProjection").map((item) => [item.projectionVersionId, item]))
    const replaySnapshots = replays.map((model) => {
      const projection = replayByProjection.get(model.sourceProjectionVersionId)
      if (!projection) throw new Error("MVP_BLUE_GREEN_REPLAY_PROJECTION_MISSING")
      return createServingReplaySnapshot(projection, model)
    })
    const replaySourceCorpusChecksum = canonicalChecksum(replays.map((item) => [item.sourceProjectionVersionId, item.modelChecksum]).sort())
    const input = Object.freeze({ schemaVersion: MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION, replaySourceCorpusId: `mvp-blue-green-replay:${replaySourceCorpusChecksum}`, replaySourceCorpusChecksum, commonWatermarkId: watermarkRows[0]!.event_id, commonWatermarkValue: END, commonWatermarkChecksum: watermarkRows[0]!.checksum, projections: result.projections, evidenceSummaries, replaySnapshots })
    const serving = servingClient(value, "PUBLISHER"), reader = servingClient(value, "READER")
    try {
      await Promise.all([serving.verify(), reader.verify()]);
      const assembled = await publishInactiveCandidateToSeparateTarget(serving, reader, input, { targetId: value.SERVING_TARGET_ID, expectedTargetId: value.SERVING_TARGET_ID })
      process.stdout.write(
        JSON.stringify({
          status: "COMPLETE",
          windows: result.windows.length,
          committedInputs: result.windows.reduce(
            (sum, window) => sum + window.committedInputs.length,
            0,
          ),
          evidencePackets: result.evidenceResults.length,
          projections: result.projections.length,
          replay: replays.length,
          datasetWatermarks: 4,
          commonWatermark: END,
          candidateCorpusId: assembled.review.candidateId,
          candidateChecksum: assembled.review.servingChecksum,
          manifestChecksum: assembled.review.manifestChecksum,
          memberSetChecksum: assembled.review.memberSetChecksum,
          commonWatermarkChecksum: assembled.review.commonWatermarkChecksum,
          replayProjectionIds: Object.fromEntries(assembled.review.replaySnapshots.map((item) => [item.instrument, item.sourceProjectionVersionId])),
          activationAvailable: false,
          servingExposureWrites: 0,
        }),
      );
    } finally {
      await Promise.allSettled([serving.shutdown(), reader.shutdown()]);
    }
  } finally {
    await result.close();
  }
}

async function main(){const value=bindings(),command=process.argv[2];if(command==="migrate")return migrate(value);if(command==="canary")return canary(value);if(command==="materialize")return full(value);throw new Error("MVP8E_COMMAND_REQUIRED")}
void main().catch((error:unknown)=>{process.stderr.write(error instanceof Error?error.message:"MVP8E_FAILED");process.exitCode=1})
