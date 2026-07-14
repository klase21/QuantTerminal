import {
  createBinanceVisionOpenInterestPartition,
  createOpenInterestExecutionSnapshot,
  createOpenInterestPartitionId,
  createOpenInterestUnitIdentity,
  D3_PHASE3_MANIFEST,
  openInterestDaysInclusive,
  parseBinanceVisionOpenInterestSource,
  type OpenInterestAvailabilityBoundary,
} from "@/lib/data-platform/population/backfill"

let failures = 0
function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
  if (!condition) failures += 1
}

const duplicateCsv = [
  "create_time,symbol,sum_open_interest,sum_open_interest_value",
  "2026-07-10 00:05:00,BTCUSDT,123.4500,456.7800",
  "2026-07-10 00:05:00,BTCUSDT,123.4500,456.7800",
  "2026-07-10 00:10:00,BTCUSDT,124.0000,460.0000",
].join("\n")
const parsed = parseBinanceVisionOpenInterestSource(duplicateCsv, "BTCUSDT")
check("exact source duplicate rejected without synthesizing an observation", parsed.rows.length === 2 && parsed.exactDuplicateRows === 1)
check("quantity and supplied notional remain distinct exact decimals", parsed.rows[0]?.openInterest === "123.4500" && parsed.rows[0]?.openInterestValue === "456.7800")
check("source timestamps normalize to UTC", parsed.rows[0]?.observedAt === "2026-07-10T00:05:00.000Z")

const conflicting = parseBinanceVisionOpenInterestSource(duplicateCsv.replace("123.4500,456.7800\n2026", "999.0000,456.7800\n2026"), "BTCUSDT")
check("conflicting duplicate observation fails closed", conflicting.rejected.SOURCE_CONFLICTING_DUPLICATE_OBSERVATION === 1)

const source = createBinanceVisionOpenInterestPartition({ symbol: "btcusdt", day: "2026-07-10" })
check("source adapter binds official daily metrics archive", source.sourceUrl.endsWith("/daily/metrics/BTCUSDT/BTCUSDT-metrics-2026-07-10.zip"))
check("source adapter retains native five-minute cadence", source.datasetId === "open-interest" && source.resolution === "5m")
check("UTC-day enumeration is inclusive", openInterestDaysInclusive("2026-07-09", "2026-07-11").join(",") === "2026-07-09,2026-07-10,2026-07-11")

const availability: readonly OpenInterestAvailabilityBoundary[] = D3_PHASE3_MANIFEST.instruments.map((instrument) => Object.freeze({
  canonicalInstrumentId: instrument.canonicalInstrumentId,
  providerSymbol: instrument.providerSymbol,
  activationTimestamp: instrument.activatedAt,
  earliestVerifiedArchiveDay: "2026-07-10",
  latestVerifiedArchiveDay: "2026-07-11",
  earliestVerifiedObservationTime: "2026-07-10T00:05:00.000Z",
  finalEligibleObservationTime: "2026-07-11T23:55:00.000Z",
  verifiedArchiveCount: 2,
  verifiedSourceBytes: 200,
  discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY",
  discoveryEvidence: "unit-fixture",
}))
const sourceBytesByPartitionId = Object.fromEntries(availability.flatMap((item) => ["2026-07-10", "2026-07-11"].map((day) => [createOpenInterestPartitionId(item.canonicalInstrumentId, day), 100])))
const input = { manifest: D3_PHASE3_MANIFEST, availability, sourceBytesByPartitionId }
const first = createOpenInterestExecutionSnapshot(input)
const reordered = createOpenInterestExecutionSnapshot({ ...input, availability: [...availability].reverse() })
check("snapshot is independent of input ordering", first.snapshotId === reordered.snapshotId)
check("snapshot retains all governed partitions", first.instruments.length === 6 && first.completePartitionCount === 12)
check("final cutoff day excludes the midnight endpoint", first.expectedObservationCount === 6 * (288 + 287))
check("OI identity binds dataset, cadence, provider, and day", createOpenInterestPartitionId("instrument", "2026-07-10") === "open-interest:instrument:5m:binance_vision_daily_metrics:2026-07-10")
check("OI Unit cannot collide with OHLCV or Funding", createOpenInterestUnitIdentity(first.parentManifestId, "instrument", "2026-07-10").startsWith("open-interest-unit:"))
check("source and execution concurrency are bounded to one", first.globalConcurrency === 1 && first.providerRequestConcurrency === 1)
check("snapshot checksum defines immutable identity", first.snapshotId === `open-interest-execution:${first.snapshotChecksum}`)

if (failures) process.exitCode = 1
