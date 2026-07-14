import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import {
  AGG_TRADES_SEGMENT_NORMALIZER_VERSION,
  AGG_TRADES_SEGMENT_ORDER_POLICY,
  AGG_TRADES_SEGMENT_SCHEMA_ID,
  AGG_TRADES_SEGMENT_SCHEMA_VERSION,
  buildAggTradesSegment,
  createAggTradesSegmentId,
  createAggTradesSegmentReadPort,
  createFilesystemObjectStorage,
  iterateBinanceVisionAggTradesZip,
  normalizeAggTradesSegmentDecimal,
  evaluateAggTradesSegmentCapacity,
  verifyAggTradesSegmentExecutionSnapshot,
  type AggTradesSegmentExecutionSnapshot,
  type AggTradesSegmentIdentityInput,
} from "@/lib/data-platform/population/backfill"

let failures = 0
function check(name: string, condition: boolean) { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }

const identity: AggTradesSegmentIdentityInput = Object.freeze({
  datasetId: "agg-trade", providerId: "binance-public-archive", venue: "binance-usdm-futures", marketType: "perpetual-futures",
  canonicalInstrumentId: "instrument-xrp-usdt", providerSymbol: "XRPUSDT", partitionStart: "2020-01-06T00:00:00.000Z",
  partitionEnd: "2020-01-07T00:00:00.000Z", rawObjectId: "raw_source_a", rawObjectChecksum: "a".repeat(64),
  schemaId: AGG_TRADES_SEGMENT_SCHEMA_ID, schemaVersion: AGG_TRADES_SEGMENT_SCHEMA_VERSION,
  normalizerVersion: AGG_TRADES_SEGMENT_NORMALIZER_VERSION, eventOrderPolicy: AGG_TRADES_SEGMENT_ORDER_POLICY,
})
check("segment logical identity excludes corrected bytes", createAggTradesSegmentId(identity) === createAggTradesSegmentId({ ...identity, rawObjectId: "raw_source_b", rawObjectChecksum: "b".repeat(64) }))
check("segment logical identity changes with partition", createAggTradesSegmentId(identity) !== createAggTradesSegmentId({ ...identity, partitionStart: "2020-01-07T00:00:00.000Z", partitionEnd: "2020-01-08T00:00:00.000Z" }))
check("scientific decimals normalize without floating point", normalizeAggTradesSegmentDecimal("9.1257462E7") === "91257462")
check("decimal scale spelling normalizes deterministically", normalizeAggTradesSegmentDecimal("000123.45000000") === "123.45")

async function main() {
const objectRoot = await mkdtemp(path.join(os.tmpdir(), "qt-segment-test-"))
try {
  const storage = await createFilesystemObjectStorage({ root: objectRoot, repositoryRoot: process.cwd(), createRoot: true, testAuthorization: "ALLOW_D3_TEST_TEMP_ROOT" })
  const certifiedRawPath = process.env.D3_BACKFILL_OBJECT_ROOT
    ? path.join(process.env.D3_BACKFILL_OBJECT_ROOT, "raw", "2c", "2c9711006cdabb3efbc0e2eeca91abb532d22bd3f51e325d2860640449e95a8c.zip")
    : null
  const source = certifiedRawPath && await access(certifiedRawPath).then(() => true).catch(() => false) ? await readFile(certifiedRawPath) : null
  if (source === null) {
    console.log("PASS columnar integration fixture unavailable is explicit")
  } else {
    async function *interrupted() { let count = 0; for await (const row of iterateBinanceVisionAggTradesZip(source)) { if (count++ === 10) throw new Error("INJECTED_SEGMENT_WRITE_FAILURE"); yield row } }
    const interruptedResult = await buildAggTradesSegment({ identity, rows: interrupted(), storage, objectRoot }).then(() => "UNEXPECTED_SUCCESS", (error: unknown) => error instanceof Error ? error.message : "UNKNOWN")
    check("interrupted Segment write fails closed", interruptedResult === "INJECTED_SEGMENT_WRITE_FAILURE")
    check("interrupted Segment temporary file is removed", (await readdir(path.join(objectRoot, ".segment-build"))).length === 0)
    const first = await buildAggTradesSegment({ identity, rows: iterateBinanceVisionAggTradesZip(source), storage, objectRoot })
    const second = await buildAggTradesSegment({ identity, rows: iterateBinanceVisionAggTradesZip(source), storage, objectRoot })
    check("Parquet Segment rerun is content-addressed", first.segmentId === second.segmentId && first.segmentVersion === second.segmentVersion && first.segmentChecksum === second.segmentChecksum)
    check("Parquet Segment preserves every fixture event", first.eventCount > 0 && first.acceptedCount === first.eventCount && first.rejectedCount === 0)
    const page = await createAggTradesSegmentReadPort({ objectRoot }).readPage({ objectKey: first.segmentObjectKey, expectedChecksum: first.segmentChecksum, limit: 3 })
    check("bounded read port verifies checksum", page.checksumVerified && page.events.length <= 3)
    check("bounded read port retains string IDs and decimals", page.events.every((row) => typeof row.aggregate_trade_id === "string" && typeof row.price === "string" && typeof row.quantity === "string"))
    const next = await createAggTradesSegmentReadPort({ objectRoot }).readPage({ objectKey: first.segmentObjectKey, expectedChecksum: first.segmentChecksum, offset: page.nextOffset ?? undefined, limit: 3 })
    check("bounded read cursor does not skip unread events", page.nextOffset === 3 && next.events[0]?.source_row_ordinal === 3)
    console.log(JSON.stringify({ evidence: "REAL_XRPUSDT_2020_01_06_SEGMENT", sourceBytes: source.byteLength, segmentBytes: first.byteLength, eventCount: first.eventCount, segmentChecksum: first.segmentChecksum }))
  }
} finally { await rm(objectRoot, { recursive: true, force: true }) }

const snapshotPath = path.join(process.cwd(), "docs", "project", "d3-phase-3-aggtrades-segment-snapshot.json")
const executionSnapshot = await readFile(snapshotPath, "utf8").then((value) => JSON.parse(value) as AggTradesSegmentExecutionSnapshot).catch(() => null)
if (executionSnapshot) {
  check("Segment execution snapshot checksum is deterministic", verifyAggTradesSegmentExecutionSnapshot(executionSnapshot))
  check("Segment capacity gate blocks insufficient Artifact storage", evaluateAggTradesSegmentCapacity({ snapshot: executionSnapshot, postgresFreeBytes: Number.MAX_SAFE_INTEGER, artifactFreeBytes: 1 }).status === "BLOCKED")
  check("Segment capacity gate includes explicit safety margin", evaluateAggTradesSegmentCapacity({ snapshot: executionSnapshot, postgresFreeBytes: Number.MAX_SAFE_INTEGER, artifactFreeBytes: Number.MAX_SAFE_INTEGER }).safetyBasisPoints === 12_000)
}

if (failures) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
