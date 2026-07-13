import { writeFile } from "node:fs/promises"
import path from "node:path"

import { D3_PHASE3_MANIFEST, buildInstrumentLifecycleInventory, inspectDurablePostgresTarget, inspectDurableTargetSeparation, inspectFilesystemObjectRoot } from "@/lib/data-platform/population/backfill"

const root = process.cwd()
const project = path.join(root, "docs", "project")
const generatedAt = new Date().toISOString()
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

const availability = [
  ["ohlcv", "binance-public-archive", "BINANCE", "USD_M_FUTURES", "5m daily/monthly ZIP", "2019-12-31T00:00:00.000Z", "2026-07-12T00:00:00.000Z", "DAY_OR_MONTH", "VERIFIED_FOR_BTC_AND_CUTOFF_DAY"],
  ["funding", "binance-public-archive", "BINANCE", "USD_M_FUTURES", "monthly fundingRate ZIP", "2020-01-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z", "MONTH", "VERIFIED_FOR_BTC_AND_ETH_LEGACY"],
  ["open-interest", "binance-public-archive", "BINANCE", "USD_M_FUTURES", "daily metrics ZIP", null, null, "DAY", "PARTIAL_LEGACY_PILOT"],
  ["liquidation", "binance-public-archive", "BINANCE", "USD_M_FUTURES", "daily liquidation ZIP", null, null, "DAY", "BLOCKED_SOURCE"],
  ["agg-trade", "binance-public-archive", "BINANCE", "USD_M_FUTURES", "daily aggTrades ZIP", null, null, "DAY", "BLOCKED_NORMALIZER_BOUNDARY"],
  ["orderbook", "cryptohftdata", null, null, "hourly provider objects", null, null, "HOUR", "BLOCKED_COST_AND_SCOPE"],
  ["prediction-market", "governed-external", null, null, null, null, null, null, "BLOCKED_REQUIRED_PROVIDER"],
  ["etf-flow", "governed-external", null, null, null, null, null, null, "BLOCKED_REQUIRED_PROVIDER"],
  ["reserve", "governed-external", null, null, null, null, null, null, "BLOCKED_REQUIRED_PROVIDER"],
  ["macro", "governed-external", null, null, null, null, null, null, "BLOCKED_REQUIRED_PROVIDER"],
  ["research-document", "governed-external", null, null, null, null, null, null, "BLOCKED_REQUIRED_TARGET"],
] as const

const blockers = [
  ["D3P3-B01", "RESOLVED", "Dataset classification is deterministic for all 17 registry entries.", "None for classification; future registry additions must be classified."],
  ["D3P3-B02", "PARTIALLY_RESOLVED", "Six active focus instruments have official Binance lifecycle metadata and checksums.", "Discover and govern delisted, renamed, transitioned, and any additional Replay-required instruments."],
  ["D3P3-B03", "PARTIALLY_RESOLVED", "A durable filesystem ObjectStoragePort with path safety, atomic writes, SHA-256 verification, reuse, and conflict rejection exists.", "Configure D3_BACKFILL_OBJECT_ROOT outside the repository and temporary directories, then verify capacity."],
  ["D3P3-B04", "PARTIALLY_RESOLVED", "Production normalizers exist for OHLCV, Funding, Open Interest, and Liquidation.", "Resolve stream-manifest identity and implement only verified provider formats for remaining required datasets."],
  ["D3P3-B05", "RESOLVED", "D2 exposes a purpose-gated durable non-production client factory and bounded latest canonical-version lookup; D3 uses only the certified public adapter.", "None for the commit boundary; durable target configuration and canary execution remain separate blockers."],
  ["D3P3-B06", "STILL_BLOCKING", "Durable target safety policy and allowlists are implemented.", "Configure D2_CANONICAL_POSTGRES_URL and D3_POPULATION_POSTGRES_URL using distinct allowlisted non-production databases."],
  ["D3P3-B07", "PARTIALLY_RESOLVED", "Checksum, immutable correction, and OHLCV daily partition policy bindings are approved from existing contracts.", "Approve retry and retention policy versions without inventing numeric values."],
  ["D3P3-B08", "STILL_BLOCKING", "Required governed-external datasets remain in authoritative scope.", "Certify exact prediction, ETF, reserve, macro, and research providers or explicitly govern a source-unavailable result."],
  ["D3P3-B09", "STILL_BLOCKING", "BTC OHLCV/Funding legacy boundaries and the six-symbol cutoff-day archives are verified.", "Complete earliest/latest availability discovery for every required dataset and instrument."],
  ["D3P3-B10", "STILL_BLOCKING", "Orderbook remains required and visible in scope.", "Obtain source-backed object count, raw-size, licensing, reconstruction, and capacity approval."],
  ["D3P3-B11", "RESOLVED", "Legacy SQLite is explicitly excluded from canonical Phase 3 counts and launch scope.", "A future import requires a separate certified lineage-preserving migration."],
] as const

async function main() {
  const objectRoot = process.env.D3_BACKFILL_OBJECT_ROOT
  const objectInspection = objectRoot ? await inspectFilesystemObjectRoot({ root: objectRoot, repositoryRoot: root, createRoot: false }) : null
  const d2 = inspectDurablePostgresTarget(process.env.D2_CANONICAL_POSTGRES_URL, "D2_CANONICAL")
  const d3 = inspectDurablePostgresTarget(process.env.D3_POPULATION_POSTGRES_URL, "D3_POPULATION")
  const separation = inspectDurableTargetSeparation({ d2: process.env.D2_CANONICAL_POSTGRES_URL, d3: process.env.D3_POPULATION_POSTGRES_URL, d2Certification: process.env.D2_ISOLATED_POSTGRES_URL, d3Certification: process.env.D3_ISOLATED_POSTGRES_URL, d4: process.env.D4_ISOLATED_POSTGRES_URL })
  await writeFile(path.join(project, "d3-phase-3-backfill-manifest.json"), json(D3_PHASE3_MANIFEST), "utf8")
  await writeFile(path.join(project, "d3-phase-3-instrument-inventory.json"), json({ schemaVersion: "1.0.0", source: "Official Binance Futures exchangeInfo and current product focus selectors", instruments: buildInstrumentLifecycleInventory() }), "utf8")
  await writeFile(path.join(project, "d3-phase-3-availability-inventory.json"), json({ generatedAt, registryVersion: "1.0.0", scopeStatus: "PARTIAL", frozenCutoffUtc: D3_PHASE3_MANIFEST.frozenCutoffUtc, datasets: availability.map(([datasetId, provider, venue, market, format, earliestVerified, latestVerifiedBoundary, partitionUnit, status]) => ({ datasetId, provider, venue, market, format, earliestVerified, latestVerifiedBoundary, partitionUnit, status })) }), "utf8")
  await writeFile(path.join(project, "d3-phase-3-blockers.json"), json({ generatedAt, status: "BLOCKING", blockers: blockers.map(([id, disposition, evidence, remainingWork]) => ({ id, disposition, evidence, remainingWork })) }), "utf8")
  await writeFile(path.join(project, "d3-phase-3-readiness.json"), json({ generatedAt, manifestId: D3_PHASE3_MANIFEST.manifestId, manifestChecksum: D3_PHASE3_MANIFEST.manifestChecksum, manifestExecutable: D3_PHASE3_MANIFEST.executable, frozenCutoffUtc: D3_PHASE3_MANIFEST.frozenCutoffUtc, executablePartitions: D3_PHASE3_MANIFEST.partitions.filter((item) => item.status === "EXECUTABLE").length, blockedPartitions: D3_PHASE3_MANIFEST.partitions.filter((item) => item.status === "BLOCKED").length, totalEnumeratedPartitions: D3_PHASE3_MANIFEST.partitions.length, fullExpectedPartitions: null, objectStorage: objectInspection ? { safe: objectInspection.safe, target: objectInspection.resolvedRoot, availableBytes: objectInspection.availableBytes, reasons: objectInspection.reasons } : { safe: false, target: null, availableBytes: null, reasons: ["D3_BACKFILL_OBJECT_ROOT_MISSING"] }, d2Target: d2, d3Target: d3, separationErrors: separation, canary: { status: "NOT_RUN", canonicalFacts: 0 }, gate: "NOT_SAFE_TO_START_FULL_BACKFILL" }), "utf8")
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
