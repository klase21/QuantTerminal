import { readFile } from "node:fs/promises"

import {
  classifySourceFinalization,
  classifyMandatoryCycleReadiness,
  commitBoundedArchiveBatch,
  createBoundedArchiveRequest,
  insertInactiveCandidateCorpus,
  inspectInactiveCandidateServingTarget,
  inspectBoundedArchiveAvailability,
  parseBoundedAggTradesArchive,
  parseBoundedOhlcvArchive,
  parseBoundedOpenInterestArchive,
  runBoundedConsistency,
  runBoundedEvidence,
  runBoundedProjections,
  runBoundedReplayMaterialization,
  runInitialBoundedRefresh,
  type BoundedSourceAvailability,
  type InactiveCandidateCorpus,
} from "@/lib/data-platform/mvp-refresh"

let failures = 0
function check(name: string, condition: boolean) { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }
async function rejects(name: string, work: () => unknown | Promise<unknown>, expected: string) { try { await work(); check(name, false) } catch (error) { check(name, error instanceof Error && error.message === expected) } }

function storedZip(name: string, content: string): Buffer {
  const filename = Buffer.from(name), body = Buffer.from(content)
  const local = Buffer.alloc(30 + filename.length)
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 8); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26); filename.copy(local, 30)
  const central = Buffer.alloc(46 + filename.length)
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 10); central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(filename.length, 28); filename.copy(central, 46)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length + body.length, 16)
  return Buffer.concat([local, body, central, eocd])
}

const start = "2026-07-14T00:00:00.000Z", end = "2026-07-15T00:00:00.000Z", now = "2026-07-16T04:00:00.000Z"
const request = (dataset: "ohlcv" | "open-interest" | "agg-trade", maximumRecordCount = 10) => createBoundedArchiveRequest({ dataset, provider: "binance-vision", instrument: "BTCUSDT", eventTimeStart: start, eventTimeEnd: end, sourceContractVersion: `fixture-${dataset}/1.0.0`, maximumRecordCount }, now)

async function main() {
  const unavailable: BoundedSourceAvailability[] = ["ohlcv", "open-interest", "agg-trade"].flatMap((dataset) => ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"].map((instrument) => ({ dataset: dataset as "ohlcv", instrument: instrument as "BTCUSDT", sourceClassification: "HTTP_NOT_FOUND" as const, available: false, finalized: false, observedThrough: null, checksumState: "NOT_VERIFIED" as const, limitationReason: "SOURCE_NOT_FINALIZED" })))
  const state = classifySourceFinalization({ now, earliestEligibility: "2026-07-16T02:00:00.000Z", observations: unavailable, requiredInstrumentCount: 18 })
  check("wall clock and source finalization remain separate", state.timeState === "TIME_ELIGIBLE" && state.sourceState === "SOURCE_NOT_FINALIZED" && state.acquisitionState === "NOT_READY_FOR_ACQUISITION")
  check("all four mandatory datasets gate acquisition", classifyMandatoryCycleReadiness({ now, earliestEligibility: "2026-07-16T02:00:00.000Z", archiveObservations: unavailable, fundingReady: true }).acquisitionState === "NOT_READY_FOR_ACQUISITION")
  let probeCalls = 0
  const unavailableProbe = await inspectBoundedArchiveAvailability(request("ohlcv"), async (_input, init) => { probeCalls += 1; check("availability probe is nonmutating HEAD", init?.method === "HEAD"); return new Response(null, { status: 404 }) })
  check("HTTP 404 is SOURCE_NOT_FINALIZED without payload retention", probeCalls === 1 && unavailableProbe.limitationReason === "SOURCE_NOT_FINALIZED" && !unavailableProbe.available)
  const blockedRun = await runInitialBoundedRefresh({} as never, now) as { readonly reason: string; readonly refreshUnitsCreated: number; readonly acquisitionStarted: boolean }
  check("source-not-finalized gate creates no partial units", blockedRun.reason === "SOURCE_NOT_FINALIZED" && blockedRun.refreshUnitsCreated === 0 && !blockedRun.acquisitionStarted)
  await rejects("open interval is rejected", () => createBoundedArchiveRequest({ dataset: "ohlcv", provider: "binance-vision", instrument: "BTCUSDT", eventTimeStart: "2026-07-16T00:00:00.000Z", eventTimeEnd: "2026-07-17T00:00:00.000Z", sourceContractVersion: "fixture", maximumRecordCount: 10 }, now), "BOUNDED_OPEN_OR_FUTURE_INTERVAL")
  await rejects("noncanonical instrument is rejected", () => createBoundedArchiveRequest({ dataset: "ohlcv", provider: "binance-vision", instrument: "BTC-USD" as "BTCUSDT", eventTimeStart: start, eventTimeEnd: end, sourceContractVersion: "fixture", maximumRecordCount: 10 }, now), "BOUNDED_INSTRUMENT_INVALID")

  const open = Date.parse(start), ohlcvZip = storedZip("BTCUSDT-5m.csv", `${open},100,110,90,105,12,${open + 299_999}\n${open + 300_000},105,115,100,110,8,${open + 599_999}\n`)
  const ohlcv = parseBoundedOhlcvArchive(request("ohlcv"), ohlcvZip)
  check("OHLCV bounded adapter preserves exact rows", ohlcv.rows.length === 2 && ohlcv.rows[0].openTime === start)
  await rejects("OHLCV immutable conflict fails closed", () => parseBoundedOhlcvArchive(request("ohlcv"), storedZip("x.csv", `${open},100,110,90,105,12,${open + 299_999}\n${open},101,110,90,105,12,${open + 299_999}\n`)), "OHLCV_IMMUTABLE_CONFLICT")

  const oiCsv = `create_time,symbol,sum_open_interest,sum_open_interest_value\n2026-07-14 00:00:00,BTCUSDT,100.5,200.5\n2026-07-14 00:05:00,BTCUSDT,101.5,201.5\n`
  const oi = parseBoundedOpenInterestArchive(request("open-interest"), storedZip("metrics.csv", oiCsv))
  check("OI bounded adapter preserves provider observations", oi.rows.length === 2 && oi.rows.every((row) => row.symbol === "BTCUSDT"))

  const aggCsv = `agg_trade_id,price,quantity,first_trade_id,last_trade_id,transact_time,is_buyer_maker\n1,100,2,10,11,${open},false\n2,101,3,12,13,${open + 1_000},true\n`
  const agg = await parseBoundedAggTradesArchive(request("agg-trade"), storedZip("agg.csv", aggCsv))
  check("AggTrades bounded adapter preserves native events", agg.rows.length === 2 && agg.rows[1].sourceTimestamp === String(open + 1_000))

  let fenceChecks = 0
  const duplicate = await commitBoundedArchiveBatch({ batch: ohlcv, createCommand: (row) => row.openTime, execute: async () => ({ status: "DUPLICATE" as const }), assertFence: async () => { fenceChecks += 1 } })
  check("bounded commit exact rerun is DUPLICATE", duplicate.status === "DUPLICATE" && duplicate.duplicateCount === 2)
  check("bounded commit checks fence for every row", fenceChecks === 2)

  const committed = ["ohlcv", "open-interest", "agg-trade", "funding"].map((dataset) => ({ dataset: dataset as "funding", instrument: "BTCUSDT", eventTimeStart: start, eventTimeEnd: end, commitChecksum: dataset.padEnd(64, "a").slice(0, 64), validationState: "PASSED" as const }))
  for (const [name, run] of [["Consistency", runBoundedConsistency], ["Evidence", runBoundedEvidence], ["Projection", runBoundedProjections], ["Replay", runBoundedReplayMaterialization]] as const) {
    const result = await run(committed, async ({ start: boundedStart, end: boundedEnd }) => [`${name}:${boundedStart}:${boundedEnd}`])
    check(`${name} entry point is affected-window bounded`, result.status === "CREATED" && result.outputIdentities.length === 1)
  }

  const candidate: InactiveCandidateCorpus = { corpusId: "candidate:test", servingChecksum: "a".repeat(64), lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY", governedThrough: end }
  let active = "active:certified", inserted: InactiveCandidateCorpus | null = null
  const insert = await insertInactiveCandidateCorpus({ transaction: async (work) => work({ activeExposure: async () => active, insertCorpusImmutable: async (value) => { inserted = value; return "INSERTED" } }) }, candidate)
  check("inactive candidate insert cannot change exposure", insert.status === "INSERTED" && insert.exposureUnchanged && inserted === candidate && active === "active:certified")
  check("missing isolated serving target fails closed", !inspectInactiveCandidateServingTarget({}).targetAllowed)

  const protectedNames = ["d3-phase-3-aggtrades-segment-progress.json", "d3-phase-3-ohlcv-progress.json", "d3-phase-3-oi-progress.json", "d3-phase-3-funding-progress.json", "mvp-recent-market-corpus-progress.json"]
  const sources = await Promise.all(["lib/data-platform/mvp-refresh/boundedAdapters.ts", "lib/data-platform/mvp-refresh/boundedPipeline.ts", "workers/data-platform/runMvpBoundedAvailability.ts"].map((file) => readFile(file, "utf8")))
  check("bounded adapters are isolated from progress files", protectedNames.every((name) => sources.every((source) => !source.includes(name))))
  if (failures) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
