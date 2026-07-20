import { readFileSync } from "node:fs"
import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import { createPopulationPostgresAdapter } from "@/lib/data-platform/population/postgres"
import { createD3ToD2CanonicalCommitPort, createFilesystemObjectStorage, createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { ConsistencyPostgresRuntime } from "@/lib/data-platform/consistency-evidence/postgres"
import { MvpServingPostgresClient } from "@/lib/data-platform/mvp-serving"
import { canonicalizeServingCorpusMembers, computeCandidateServingChecksum, LocalInactiveCandidateAssemblyService, type ServingCorpusMember } from "@/lib/data-platform/mvp-serving/candidateMembership"
import { MvpRefreshPostgresClient } from "@/lib/data-platform/mvp-refresh/client"
import { DEFAULT_MVP_REFRESH_POLICY } from "@/lib/data-platform/mvp-refresh/service"
import { createRefreshPlan } from "@/lib/data-platform/mvp-refresh/contracts"
import { createRefreshLogicalSlot, type RefreshLogicalDataset, type RefreshLogicalInstrument } from "@/lib/data-platform/mvp-refresh/unitReconciliation"
import { createLiveExecutorPortSet, createLiveWatermarkPorts, type LiveExecutorInvocation, type LiveExecutorPortResult } from "@/lib/data-platform/mvp-refresh/liveExecutorPorts"
import { createDatasetAdapter, createDownstreamExecutor, createWatermarkAudit } from "@/lib/data-platform/mvp-refresh/liveResumeLocalBootstrap"
import { MvpRefreshStore } from "@/lib/data-platform/mvp-refresh/store"

const START = process.env.MVP_BLUE_GREEN_WINDOW_START ?? "2026-07-15T00:00:00.000Z"
const END = process.env.MVP_BLUE_GREEN_WINDOW_END ?? "2026-07-16T00:00:00.000Z"
const INGEST_ONLY = process.env.MVP_BLUE_GREEN_INGEST_ONLY === "1"
const INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
const DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"] as const)
const CONTRACTS: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({ ohlcv: "mvp-bounded-ohlcv/1.0.0", "open-interest": "mvp-bounded-open-interest/1.0.0", funding: "binance-official-rest-funding-rate/1.0.0", "agg-trade": "mvp-bounded-agg-trade/1.0.0" })
const PROVIDERS: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({ ohlcv: "binance-vision", "open-interest": "binance-vision", funding: "binance-official-rest", "agg-trade": "binance-vision" })

function loadEnvironment(): NodeJS.ProcessEnv {
  const path = process.env.MVP8B_META_PATH
  if (!path) throw new Error("MVP8B_META_PATH_REQUIRED")
  const values = Object.fromEntries(readFileSync(path, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map((line) => { const at = line.indexOf("="); return [line.slice(0, at), line.slice(at + 1)] })) as Record<string, string>
  return { ...process.env, MVP_BLUE_GREEN_RELEASE_MODE: values.MVP_BLUE_GREEN_RELEASE_MODE, MVP_BLUE_GREEN_TARGET_ID: values.MVP_BLUE_GREEN_REFRESH_TARGET_ID, MVP_BLUE_GREEN_REFRESH_DATABASE: values.MVP_BLUE_GREEN_REFRESH_DATABASE, MVP_BLUE_GREEN_REFRESH_ROLE: values.MVP_BLUE_GREEN_REFRESH_ROLE, D2_CANONICAL_POSTGRES_URL: values.D2_CANONICAL_POSTGRES_URL, D3_POPULATION_POSTGRES_URL: values.D3_POPULATION_POSTGRES_URL, D3_BACKFILL_OBJECT_ROOT: values.OBJECT_ROOT, D4_ISOLATED_POSTGRES_URL: values.D4_ISOLATED_POSTGRES_URL, D4_EXPECTED_DATABASE_NAME: values.D4_EXPECTED_DATABASE_NAME, MVP_REFRESH_ISOLATED_POSTGRES_URL: values.MVP_REFRESH_ISOLATED_POSTGRES_URL, MVP_SERVING_ISOLATED_POSTGRES_URL: values.MVP_SERVING_ISOLATED_POSTGRES_URL }
}

function slot(dataset: RefreshLogicalDataset, instrument: RefreshLogicalInstrument) {
  return createRefreshLogicalSlot({ provider: PROVIDERS[dataset], dataset, instrument, intervalStart: START, intervalEnd: END, contractVersion: CONTRACTS[dataset] })
}

function asSlotResult(result: LiveExecutorPortResult) {
  if ((result.status !== "CREATED" && result.status !== "DUPLICATE") || !result.retrievalIdentity || !result.rawArtifactIdentity || !result.rawArtifactChecksum || !result.candidateIdentity || !result.candidateChecksum) throw new Error(`MVP8B_SLOT_FAILED:${result.dataset}:${result.instrument}:${result.status}`)
  return Object.freeze({ logicalSlotId: result.logicalSlotId, executionGenerationId: result.executionGenerationId, dataset: result.dataset, instrument: result.instrument, intervalStart: result.intervalStart, intervalEnd: result.intervalEnd, unitId: result.unitId, sourceContractId: result.sourceContractId, sourceContractVersion: result.sourceContractVersion, providerBinding: result.providerBinding, retrievalIdentity: result.retrievalIdentity, rawArtifactIdentity: result.rawArtifactIdentity, rawArtifactChecksum: result.rawArtifactChecksum, candidateIdentity: result.candidateIdentity, candidateChecksum: result.candidateChecksum, canonicalCommitResult: result.status, canonicalFactIdentities: result.canonicalOutputIdentities, validationStatus: "PASSED" as const, limitations: result.limitations, durationMs: result.durationMs, retainedBytes: result.retainedBytes })
}

async function main(): Promise<void> {
  if (Date.parse(END) - Date.parse(START) !== 86_400_000 || new Date(Date.parse(START)).toISOString() !== START || new Date(Date.parse(END)).toISOString() !== END) throw new Error("MVP_BLUE_GREEN_DAILY_WINDOW_REQUIRED")
  const environment = loadEnvironment()
  const objectRoot = environment.D3_BACKFILL_OBJECT_ROOT!
  const plannerIdentity = `mvp8b-fresh-core:${canonicalChecksum({ sourceCommit: process.env.MVP8B_SOURCE_COMMIT, start: START, end: END })}`
  const plannerChecksum = canonicalChecksum({ plannerIdentity, start: START, end: END, topology: "FRESH_CORE_DIRECT_LOAD" })
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp8b-direct-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp8b-direct-d3" } }, environment)
  const d4Environment = { MVP_BLUE_GREEN_RELEASE_MODE: environment.MVP_BLUE_GREEN_RELEASE_MODE, D4_ISOLATED_POSTGRES_URL: environment.D4_ISOLATED_POSTGRES_URL, D4_EXPECTED_DATABASE_NAME: environment.D4_EXPECTED_DATABASE_NAME, D2_CANONICAL_POSTGRES_URL: environment.D2_CANONICAL_POSTGRES_URL, D3_POPULATION_POSTGRES_URL: environment.D3_POPULATION_POSTGRES_URL, MVP_REFRESH_ISOLATED_POSTGRES_URL: environment.MVP_REFRESH_ISOLATED_POSTGRES_URL, MVP_SERVING_ISOLATED_POSTGRES_URL: environment.MVP_SERVING_ISOLATED_POSTGRES_URL }
  const runtime = (roleIntent: "MIGRATION_OWNER" | "CONSISTENCY_WORKER" | "EVIDENCE_ASSEMBLER" | "PROJECTION_BUILDER", name: string) => new ConsistencyPostgresRuntime({ connectionString: environment.D4_ISOLATED_POSTGRES_URL!, roleIntent, maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: name, environment: d4Environment })
  const d4 = runtime("MIGRATION_OWNER", "mvp8b-direct-d4"), consistency = runtime("CONSISTENCY_WORKER", "mvp8b-direct-consistency"), evidence = runtime("EVIDENCE_ASSEMBLER", "mvp8b-direct-evidence"), projection = runtime("PROJECTION_BUILDER", "mvp8b-direct-projection")
  const refresh = new MvpRefreshPostgresClient(environment.MVP_REFRESH_ISOLATED_POSTGRES_URL!, environment, { database: environment.MVP_BLUE_GREEN_REFRESH_DATABASE ?? "quantterminal_mvp_refresh_isolated", role: environment.MVP_BLUE_GREEN_REFRESH_ROLE ?? "qt_d2_owner" })
  const serving = INGEST_ONLY ? null : new MvpServingPostgresClient(environment.MVP_SERVING_ISOLATED_POSTGRES_URL!, "PUBLISHER", environment, "LOCAL_ISOLATED")
  try {
    await Promise.all([d4.connect(), consistency.connect(), evidence.connect(), projection.connect(), refresh.verify(), ...(serving ? [serving.verify()] : [])])
    const storage = await createFilesystemObjectStorage({ root: objectRoot, repositoryRoot: process.cwd(), createRoot: false })
    const refreshStore = new MvpRefreshStore(refresh)
    const d2Adapter = createCanonicalPersistenceAdapter(integrated.d2), d3Adapter = createPopulationPostgresAdapter(integrated.d3), canonical = createD3ToD2CanonicalCommitPort(d2Adapter)
    const adapter = (dataset: RefreshLogicalDataset) => createDatasetAdapter({ dataset, storage, objectRoot, d2Client: integrated.d2, d2: d2Adapter, d3: d3Adapter, canonical, refresh: refreshStore, allowBtcOhlcvAcquisition: dataset === "ohlcv", enableResumeReconciliation: false })
    const executors = createLiveExecutorPortSet({ ohlcv: adapter("ohlcv"), "open-interest": adapter("open-interest"), funding: adapter("funding"), "agg-trade": adapter("agg-trade") })
    const slots = DATASETS.flatMap((dataset) => INSTRUMENTS.map((instrument) => slot(dataset, instrument)))
    const btc = slots.find((value) => value.dataset === "ohlcv" && value.instrument === "BTCUSDT")!
    const canary = slots.find((value) => value.dataset === "open-interest" && value.instrument === "SOLUSDT")!
    const ordered = Object.freeze([btc, canary, ...slots.filter((value) => value.logicalSlotId !== btc.logicalSlotId && value.logicalSlotId !== canary.logicalSlotId)])
    const window = Object.freeze({ requestedStart: START, requestedEnd: END, lastEligibleClosedEnd: END, unavailableInterval: null, gapInterval: null, overlapInterval: null })
    const plan = createRefreshPlan({ policy: DEFAULT_MVP_REFRESH_POLICY, activeCorpusId: "mvp8b-fresh-no-active-corpus", activeServingChecksum: canonicalChecksum("mvp8b-fresh-no-active-corpus"), activeGovernedThrough: START, window })
    const runId = `mvp8b_run_${canonicalChecksum({ planId: plan.planId, plannerChecksum })}`
    await refreshStore.putPolicy(DEFAULT_MVP_REFRESH_POLICY); await refreshStore.putPlan(plan); await refreshStore.putRun(runId, plan.planId, canonicalChecksum({ runId, planId: plan.planId, plannerChecksum }))
    await refreshStore.putUnits(ordered.map((value) => ({ unitId: `mvp8b_unit_${canonicalChecksum({ runId, logicalSlotId: value.logicalSlotId })}`, runId, instrument: value.instrument, datasetId: value.dataset, intervalStart: START, intervalEnd: END, checksum: canonicalChecksum({ runId, logicalSlotId: value.logicalSlotId }) })))
    await refreshStore.transitionRun(runId, "ACQUIRING")
    const results = []
    for (const value of ordered) {
      const unitId = `mvp8b_unit_${canonicalChecksum({ runId, logicalSlotId: value.logicalSlotId })}`
      const leaseKey = `mvp8b:${unitId}`, owner = "mvp8b-fresh-core-direct-load"
      const lease = await refreshStore.acquireLease(leaseKey, owner, 1_800)
      if (!lease.acquired) throw new Error(`MVP8B_REFRESH_LEASE_UNAVAILABLE:${value.dataset}:${value.instrument}`)
      await refreshStore.transitionUnit(unitId, "LEASED")
      try {
        const invocation: LiveExecutorInvocation = Object.freeze({ intervalStart: START, intervalEnd: END, logicalSlotId: value.logicalSlotId, executionGenerationId: runId, plannerIdentity, plannerChecksum, sourceContractId: value.contractVersion, sourceContractVersion: value.contractVersion, providerBinding: value.provider, unitId, dataset: value.dataset, instrument: value.instrument, fencingToken: lease.fencingToken, checkpointInputChecksum: canonicalChecksum({ runId, unitId, logicalSlotId: value.logicalSlotId }), allowedDatasets: DATASETS, allowedInstruments: INSTRUMENTS, requiredUpstream: Object.freeze([]), mode: "LIVE" })
        const execute = value.dataset === "ohlcv" ? executors.executeBoundedOhlcvSlot : value.dataset === "open-interest" ? executors.executeBoundedOpenInterestSlot : value.dataset === "funding" ? executors.executeBoundedFundingSlot : executors.executeBoundedAggTradesSlot
        const result = await execute(invocation)
        results.push(asSlotResult(result))
        await refreshStore.transitionUnit(unitId, "ACQUIRED"); await refreshStore.transitionUnit(unitId, "NORMALIZED"); await refreshStore.transitionUnit(unitId, "COMMITTED"); await refreshStore.transitionUnit(unitId, "VALIDATED"); await refreshStore.transitionUnit(unitId, "COMPLETE")
        await refreshStore.releaseLease(leaseKey, owner, lease.fencingToken)
        process.stdout.write(`${JSON.stringify({ kind: value.logicalSlotId === btc.logicalSlotId ? "AUTHORITY_SEED" : value.logicalSlotId === canary.logicalSlotId ? "CANARY" : "SLOT", dataset: value.dataset, instrument: value.instrument, status: result.status, canonicalCount: result.canonicalOutputIdentities.length })}\n`)
      } catch (error) {
        await refreshStore.releaseLease(leaseKey, owner, lease.fencingToken).catch(() => undefined)
        await refreshStore.transitionUnit(unitId, "FAILED", [error instanceof Error ? error.message.split(":")[0]! : "MVP8B_SLOT_FAILED"]).catch(() => undefined)
        await refreshStore.transitionRun(runId, "FAILED", [error instanceof Error ? error.message.split(":")[0]! : "MVP8B_SLOT_FAILED"]).catch(() => undefined)
        throw error
      }
    }
    await refreshStore.transitionRun(runId, "NORMALIZING"); await refreshStore.transitionRun(runId, "COMMITTING"); await refreshStore.transitionRun(runId, "VALIDATING")
    const watermarkPorts = createLiveWatermarkPorts(createWatermarkAudit(refreshStore))
    const datasetOutputs = []
    for (const dataset of DATASETS) datasetOutputs.push(await watermarkPorts.persistDataset(dataset, END, results.filter((value) => value.dataset === dataset)))
    const common = await watermarkPorts.persistCommon(END, datasetOutputs)
    if (INGEST_ONLY) {
      await refreshStore.transitionRun(runId, "MATERIALIZING"); await refreshStore.transitionRun(runId, "COMPARING"); await refreshStore.transitionRun(runId, "READY_FOR_RELEASE_REVIEW")
      process.stdout.write(JSON.stringify({ kind: "FINAL", mode: "INGEST_ONLY", runId, logicalSlots: slots.length, commonWatermark: END, datasetWatermarks: datasetOutputs.length, productionMutation: false, servingExposureWrites: 0 }))
      return
    }
    const downstream = createDownstreamExecutor({ d2: integrated.d2, d3: integrated.d3, objectRoot, refresh: refreshStore, consistency, evidence, projection })
    let upstream = datasetOutputs.flatMap((value) => value.identities.map((identity) => ({ identity, checksum: value.checksum }))).concat(common.identities.map((identity) => ({ identity, checksum: common.checksum })))
    const downstreamOutputs = []
    for (const stage of ["coverage", "consistency", "evidence", "projections", "replay"] as const) { const output = await downstream.execute({ stage, intervalStart: START, intervalEnd: END, slots: results, upstream }); downstreamOutputs.push({ stage, output }); upstream = output.identities.map((identity) => ({ identity, checksum: output.checksum })) }
    await refreshStore.transitionRun(runId, "MATERIALIZING")
    const members: ServingCorpusMember[] = downstreamOutputs.flatMap(({ stage, output }) => output.identities.map((identity, index) => Object.freeze({ memberKind: "RELEASE_MANIFEST" as const, memberId: identity, memberChecksum: output.checksum, canonicalSortKey: `${stage.toUpperCase()}:${String(index).padStart(4, "0")}:${identity}`, inheritedSourceCorpusId: null, schemaVersion: "mvp8b-fresh-core/1.0.0", metadata: Object.freeze({ stage, targetWindow: true }) })))
    const canonicalMembers = canonicalizeServingCorpusMembers(members), schemaVersion = "mvp-serving/1.0.0", servingChecksum = computeCandidateServingChecksum({ governedThrough: END, schemaVersion, members: canonicalMembers }), corpusId = `mvp8b-fresh-candidate:${servingChecksum}`
    if (!serving) throw new Error("MVP_BLUE_GREEN_SERVING_CLIENT_REQUIRED")
    const candidate = await new LocalInactiveCandidateAssemblyService(serving).assembleGenesis({ candidate: { corpusId, sourceCorpusId: "mvp8b-fresh-genesis", sourceCorpusChecksum: canonicalChecksum("mvp8b-fresh-genesis"), governedThrough: END, schemaVersion, generatedAt: new Date().toISOString(), members: canonicalMembers, limitations: Object.freeze(["INACTIVE_LOCAL_CANDIDATE", "FRESH_CORE_DIRECT_LOAD"]) } })
    await refreshStore.transitionRun(runId, "COMPARING"); await refreshStore.transitionRun(runId, "READY_FOR_RELEASE_REVIEW")
    const counts = await Promise.all([integrated.d3.sql.unsafe<Array<{ count: string }>>("SELECT count(*)::text count FROM control.retrieval_attempts"), integrated.d2.sql.unsafe<Array<{ count: string }>>("SELECT count(*)::text count FROM raw.objects"), integrated.d3.sql.unsafe<Array<{ count: string }>>("SELECT count(*)::text count FROM population.candidates"), integrated.d2.sql.unsafe<Array<{ count: string }>>("SELECT ((SELECT count(*) FROM canonical.ohlcv)+(SELECT count(*) FROM canonical.open_interest)+(SELECT count(*) FROM canonical.funding)+(SELECT count(*) FROM canonical.stream_manifests))::text count")])
    const activeLeases = await integrated.d3.sql.unsafe<Array<{ count: string }>>("SELECT count(*)::text count FROM control.population_leases WHERE released_at IS NULL AND expires_at>now()")
    process.stdout.write(JSON.stringify({ kind: "FINAL", runId, logicalSlots: slots.length, authoritySeeds: 1, executableSlots: 23, candidateStatus: candidate.status, candidateCorpusId: corpusId, candidateChecksum: candidate.servingChecksum, manifestChecksum: candidate.manifestChecksum, activationAvailable: false, counts: { retrievals: Number(counts[0][0]?.count), objects: Number(counts[1][0]?.count), candidates: Number(counts[2][0]?.count), facts: Number(counts[3][0]?.count) }, activeLeases: Number(activeLeases[0]?.count), datasetWatermarks: datasetOutputs.length, commonWatermark: END, downstream: Object.fromEntries(downstreamOutputs.map(({ stage, output }) => [stage, output.identities.length])) }))
  } finally {
    await Promise.allSettled([d4.shutdown(), consistency.shutdown(), evidence.shutdown(), projection.shutdown(), refresh.shutdown(), ...(serving ? [serving.shutdown()] : []), integrated.shutdown()])
  }
}

void main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message : "MVP8B_FRESH_CORE_DIRECT_LOAD_FAILED"); process.exitCode = 1 })
