import {
  createAggTradesExecutionSnapshot,
  createAggTradesPartitionId,
  createAggTradesUnitIdentity,
  createBinanceVisionAggTradesPartition,
  D3_PHASE3_MANIFEST,
  evaluateAggTradesCapacity,
  parseBinanceVisionAggTradeLine,
  type AggTradesAvailabilityBoundary,
} from "@/lib/data-platform/population/backfill"

let failures = 0
function check(name: string, condition: boolean) { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }

const row = parseBinanceVisionAggTradeLine("900719925474099312345,123.45000000,0.00123000,900719925474099312300,900719925474099312399,1720656000123,true", 0)
check("aggregate trade ID remains string-safe", row.aggregateTradeId === "900719925474099312345")
check("underlying trade IDs remain string-safe", row.firstTradeId === "900719925474099312300" && row.lastTradeId === "900719925474099312399")
check("source decimal precision retained", row.price === "123.45000000" && row.quantity === "0.00123000")
check("provider buyer-maker flag retained without side inference", row.buyerIsMaker)
check("provider timestamp normalized to UTC", row.tradeTime === "2024-07-11T00:00:00.123Z")
check("provider scientific decimal spelling remains exact", parseBinanceVisionAggTradeLine("1,0.07469,9.1257462E7,2,3,1720656000123,false", 0).quantity === "9.1257462E7")

const source = createBinanceVisionAggTradesPartition({ symbol: "btcusdt", day: "2026-07-10" })
check("source adapter uses official daily aggTrades object", source.sourceUrl.endsWith("/daily/aggTrades/BTCUSDT/BTCUSDT-aggTrades-2026-07-10.zip"))
check("source adapter retains tick semantics", source.datasetId === "agg-trade" && source.resolution === "tick")

const availability: readonly AggTradesAvailabilityBoundary[] = D3_PHASE3_MANIFEST.instruments.map((instrument) => Object.freeze({
  canonicalInstrumentId: instrument.canonicalInstrumentId,
  providerSymbol: instrument.providerSymbol,
  activationTimestamp: instrument.activatedAt,
  earliestVerifiedArchiveDay: "2026-07-10",
  latestVerifiedArchiveDay: "2026-07-11",
  archiveCount: 2,
  compressedSourceBytes: 300,
  archives: Object.freeze([{ day: "2026-07-10", compressedBytes: 100 }, { day: "2026-07-11", compressedBytes: 200 }]),
  sizeSamples: Object.freeze([{ day: "2026-07-10", compressedBytes: 100, uncompressedBytes: 400, records: 10, headerPresent: true }]),
  estimatedRecords: 30,
  conservativeRecords: 40,
  discoveryMethod: "BINANCE_VISION_S3_COMPLETE_PREFIX_INVENTORY",
}))
const input = { manifest: D3_PHASE3_MANIFEST, availability }
const first = createAggTradesExecutionSnapshot(input)
const reordered = createAggTradesExecutionSnapshot({ ...input, availability: [...availability].reverse() })
check("snapshot is input-order independent", first.snapshotId === reordered.snapshotId)
check("complete governed inventory retained", first.instruments.length === 6 && first.completePartitionCount === 12)
check("per-record identity includes dataset and provider source", createAggTradesPartitionId("instrument", "2026-07-10") === "agg-trade:instrument:tick:binance_vision_daily:2026-07-10")
check("AggTrades Unit cannot collide with other datasets", createAggTradesUnitIdentity(first.parentManifestId, "instrument", "2026-07-10").startsWith("agg-trade-unit:"))
check("concurrency is bounded to one", first.globalConcurrency === 1 && first.providerDownloadConcurrency === 1)
check("snapshot checksum defines immutable identity", first.snapshotId === `agg-trades-execution:${first.snapshotChecksum}`)
check("capacity gate blocks insufficient PostgreSQL", evaluateAggTradesCapacity({ snapshot: first, postgresFreeBytes: 1, artifactFreeBytes: 10_000 }).reasonCodes.includes("POSTGRES_CAPACITY_INSUFFICIENT"))
check("capacity gate passes adequate targets", evaluateAggTradesCapacity({ snapshot: first, postgresFreeBytes: Number.MAX_SAFE_INTEGER, artifactFreeBytes: Number.MAX_SAFE_INTEGER }).status === "PASS")

const adapterSource = readFileSync(path.join(process.cwd(), "lib", "data-platform", "population", "postgres", "adapter.ts"), "utf8")
const intermediate = adapterSource.slice(adapterSource.indexOf("async recordIntermediateD2Result"), adapterSource.indexOf("async heartbeat"))
check("intermediate per-record result does not complete the Unit", !intermediate.includes("advance_population_unit") && !intermediate.includes("current_state='COMPLETED'"))
const runnerSource = readFileSync(path.join(process.cwd(), "workers", "data-platform", "runD3AggTradesBackfill.ts"), "utf8")
check("runner crosses governed candidate-ready boundary", runnerSource.indexOf('"CANDIDATES_READY"') < runnerSource.indexOf('"PROCESSING"'))
check("full launch remains capacity gated", runnerSource.includes('status: "BLOCKED_CAPACITY"'))
check("capacity-approved execution uses the partition engine", runnerSource.includes("async function runPartitions") && runnerSource.includes("await runPartition(snapshot, clients, partition)"))

if (failures) process.exitCode = 1
import { readFileSync } from "node:fs"
import path from "node:path"
