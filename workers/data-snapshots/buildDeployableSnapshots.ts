import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  artifactSourceHash,
  withPayloadSize,
  type StandardArtifactIndex,
  type StandardArtifactScope,
  type StandardArtifactType,
} from "@/core/artifact-standardization"
import {
  DEPLOYABLE_COVERAGE_SURFACES,
  DEPLOYABLE_COVERAGE_TYPES,
  DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION,
  type DeployableCoverageIndex,
  type DeployableCoverageSurface,
  type DeployableCoverageType,
  type DeployableFundingRecord,
  type DeployableOpenInterestRecord,
  type DeployableSnapshot,
  type DeployableSnapshotCoverage,
  type DeployableSnapshotFreshness,
} from "@/core/deployable-snapshots"
import type { EtfArtifactMetadata, EtfSnapshot } from "@/core/etf-intelligence"
import type {
  ExchangeFlowArtifactMetadata,
  ExchangeFlowSnapshot,
} from "@/core/exchange-flow"
import type { IntelligenceArtifact } from "@/core/intelligence-artifacts"
import {
  listLiquidationEvidence,
  type LiquidationEvidence,
} from "@/core/liquidation-intelligence"
import type {
  TreasuryArtifactMetadata,
  TreasurySnapshot,
} from "@/core/treasury-intelligence"
import { buildMarketDrivers, discoverMarketDriverSymbols } from "@/lib/market-driver/buildMarketDrivers"
import { FileBackedIntelligenceArtifactRegistry } from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import { HISTORICAL_CACHE_ROOT } from "@/lib/historical-intelligence/cache/cachePaths"

const OUTPUT_ROOT = path.join(process.cwd(), ".data", "artifacts")
const CURRENT_WINDOW_MS = 48 * 60 * 60 * 1000

function latestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values.map((value) => Date.parse(value ?? "")).filter(Number.isFinite)
  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null
}

function freshness(observedAt: string | null, now = Date.now()): DeployableSnapshotFreshness {
  if (!observedAt) return "missing"
  const timestamp = Date.parse(observedAt)
  if (!Number.isFinite(timestamp)) return "missing"
  return now - timestamp <= CURRENT_WINDOW_MS ? "current" : "stale"
}

function coverage(count: number, expected: number): DeployableSnapshotCoverage {
  if (!count) return "unavailable"
  return count >= expected ? "full" : "partial"
}

function snapshot<T>(input: {
  id: string
  artifactType: StandardArtifactType
  scope: StandardArtifactScope
  timeframe: string | null
  partitionKey: string
  source: string
  generatedAt: string
  observedAt: string | null
  coverage: DeployableSnapshotCoverage
  data: T
  recordCount: number
  reason?: string
}): DeployableSnapshot<T> {
  return withPayloadSize({
    schemaVersion: DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION,
    snapshotId: input.id,
    metadata: {
      artifactType: input.artifactType,
      scope: input.scope,
      timeframe: input.timeframe,
      partitionKey: input.partitionKey,
      source: input.source,
      generatedAt: input.generatedAt,
      observedAt: input.observedAt,
      sourceHash: artifactSourceHash(input.source, input.data),
      recordCount: input.recordCount,
      payloadSizeBytes: 0,
      freshness: freshness(input.observedAt),
      coverage: input.coverage,
      storageClass: "deployable_snapshot",
      reason: input.reason,
    },
    data: input.data,
  })
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, file)
}

function latestBy<T>(items: T[], key: (item: T) => string, time: (item: T) => string) {
  const latest = new Map<string, T>()
  for (const item of items) {
    const current = latest.get(key(item))
    if (!current || Date.parse(time(item)) > Date.parse(time(current))) {
      latest.set(key(item), item)
    }
  }
  return [...latest.values()]
}

function artifactSnapshots<T>(
  artifacts: IntelligenceArtifact[],
  type: IntelligenceArtifact["type"],
  select: (artifact: IntelligenceArtifact) => T | undefined,
) {
  return artifacts.filter((artifact) => artifact.type === type).flatMap((artifact) => {
    const value = select(artifact)
    return value ? [value] : []
  })
}

async function ohlcvAvailability(symbols: string[]) {
  const available = new Set<string>()
  const observedAt: string[] = []
  for (const symbol of symbols) {
    const file = path.join(
      HISTORICAL_CACHE_ROOT,
      "market-data",
      "ohlcv",
      "exchange=binance_futures",
      "interval=1h",
      `symbol=${symbol}`,
      "manifest.json",
    )
    try {
      const manifest = JSON.parse(await readFile(file, "utf8")) as {
        status?: string
        metadata?: { recordCount?: number; lastTimestamp?: number | null }
      }
      if (manifest.status === "complete" && (manifest.metadata?.recordCount ?? 0) > 0) {
        available.add(symbol)
        if (Number.isFinite(manifest.metadata?.lastTimestamp)) {
          observedAt.push(new Date(manifest.metadata!.lastTimestamp!).toISOString())
        }
      }
    } catch {
      // Coverage records missing canonical cache explicitly.
    }
  }
  return {
    symbols: available,
    observedAt: latestTimestamp(observedAt),
  }
}

function coverageEntries(input: {
  snapshots: Map<DeployableCoverageType, DeployableSnapshot<unknown>>
  ohlcvCoverage: DeployableSnapshotCoverage
  ohlcvObservedAt: string | null
}) {
  const relevant: Record<DeployableCoverageSurface, DeployableCoverageType[]> = {
    Dashboard: ["ETF", "funding", "open_interest", "liquidation", "exchange_flow", "treasury", "market_drivers"],
    Markets: ["OHLCV", "funding", "open_interest", "liquidation"],
    Research: ["OHLCV", "ETF", "exchange_flow", "treasury", "market_drivers"],
    Replay: ["OHLCV", "funding", "open_interest", "liquidation"],
    "Historical Intelligence": ["OHLCV", "market_drivers"],
  }
  return DEPLOYABLE_COVERAGE_SURFACES.flatMap((surface) => (
    relevant[surface].map((type) => {
      if (type === "OHLCV") {
        return {
          surface,
          type,
          freshness: freshness(input.ohlcvObservedAt),
          coverage: input.ohlcvCoverage,
          artifact: null,
          reason: "Canonical OHLCV cache coverage is indexed without embedding candle payloads.",
        }
      }
      const value = input.snapshots.get(type)
      return {
        surface,
        type,
        freshness: value?.metadata.freshness ?? "missing",
        coverage: value?.metadata.coverage ?? "unavailable",
        artifact: value ? artifactName(type) : null,
        reason: value?.metadata.reason,
      }
    })
  ))
}

function artifactName(type: DeployableCoverageType) {
  const names: Partial<Record<DeployableCoverageType, string>> = {
    market_drivers: "latest-market-drivers.json",
    ETF: "etf-latest.json",
    funding: "funding-latest.json",
    open_interest: "open-interest-latest.json",
    liquidation: "liquidation-latest.json",
    exchange_flow: "exchange-flow-latest.json",
    treasury: "treasury-latest.json",
  }
  return names[type] ?? null
}

export async function buildDeployableSnapshots() {
  const generatedAt = new Date().toISOString()
  const registry = new FileBackedIntelligenceArtifactRegistry()
  const artifacts = await registry.list()
  const symbols = await discoverMarketDriverSymbols(registry)
  const marketDrivers = await Promise.all(
    symbols.map((symbol) => buildMarketDrivers({ symbol, registry })),
  )
  const etf = latestBy(
    artifactSnapshots<EtfSnapshot>(
      artifacts,
      "etf_snapshot",
      (artifact) => (artifact.metadata as Partial<EtfArtifactMetadata>).snapshot,
    ),
    (item) => item.asset,
    (item) => item.timestamp,
  )
  const exchangeFlow = latestBy(
    artifactSnapshots<ExchangeFlowSnapshot>(
      artifacts,
      "exchange_flow",
      (artifact) => (artifact.metadata as Partial<ExchangeFlowArtifactMetadata>).snapshot,
    ),
    (item) => `${item.exchange}:${item.asset}`,
    (item) => item.timestamp,
  )
  const treasury = latestBy(
    artifactSnapshots<TreasurySnapshot>(
      artifacts,
      "treasury_snapshot",
      (artifact) => (artifact.metadata as Partial<TreasuryArtifactMetadata>).snapshot,
    ),
    (item) => `${item.holder}:${item.asset}`,
    (item) => item.timestamp,
  )
  const funding: DeployableFundingRecord[] = marketDrivers.flatMap((summary) => (
    summary.drivers
      .filter((driver) => driver.category === "funding" && driver.evidence.value !== null && driver.evidence.observedAt)
      .map((driver) => ({
        symbol: summary.symbol,
        fundingRate: driver.evidence.value!,
        observedAt: driver.evidence.observedAt!,
        source: driver.evidence.source,
      }))
  ))
  const openInterest: DeployableOpenInterestRecord[] = marketDrivers.flatMap((summary) => (
    summary.drivers
      .filter((driver) => driver.category === "open_interest" && driver.evidence.value !== null && driver.evidence.observedAt)
      .map((driver) => ({
        symbol: summary.symbol,
        changePercent: driver.evidence.value!,
        observedAt: driver.evidence.observedAt!,
        source: driver.evidence.source,
      }))
  ))
  const liquidations = (
    await Promise.all(symbols.map((symbol) => (
      listLiquidationEvidence({ exchange: "binance_futures", symbol })
    )))
  ).flat()
  const latestLiquidations = latestBy(
    liquidations,
    (item) => `${item.exchange}:${item.symbol}`,
    (item) => item.symbols[0]?.lastTimestamp ?? item.window.end,
  )

  const deployable = new Map<DeployableCoverageType, DeployableSnapshot<unknown>>()
  deployable.set("market_drivers", snapshot({
    id: "latest-market-drivers",
    artifactType: "market_driver",
    scope: {
      kind: "multi_symbol",
      symbols,
      exchange: "binance_futures",
    },
    timeframe: "1d",
    partitionKey: "market-driver/multi/1d/latest",
    source: "market-driver-engine-v2",
    generatedAt,
    observedAt: latestTimestamp(marketDrivers.map((item) => item.timestamp)),
    coverage: coverage(marketDrivers.length, symbols.length),
    data: marketDrivers,
    recordCount: marketDrivers.length,
  }))
  deployable.set("ETF", snapshot({
    id: "etf-latest",
    artifactType: "etf",
    scope: {
      kind: "multi_symbol",
      assets: etf.map((item) => item.asset),
    },
    timeframe: "1d",
    partitionKey: "etf/multi/1d/latest",
    source: etf.map((item) => item.source).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "unavailable",
    generatedAt,
    observedAt: latestTimestamp(etf.map((item) => item.timestamp)),
    coverage: coverage(etf.length, symbols.length),
    data: etf,
    recordCount: etf.length,
    reason: etf.length ? undefined : "No prepared ETF artifacts are available.",
  }))
  deployable.set("funding", snapshot({
    id: "funding-latest",
    artifactType: "funding",
    scope: {
      kind: "multi_symbol",
      symbols: funding.map((item) => item.symbol),
      exchange: "binance_futures",
    },
    timeframe: "1h",
    partitionKey: "funding/multi/1h/latest",
    source: "binance-futures-premium-index",
    generatedAt,
    observedAt: latestTimestamp(funding.map((item) => item.observedAt)),
    coverage: coverage(funding.length, symbols.length),
    data: funding,
    recordCount: funding.length,
    reason: funding.length ? undefined : "No current funding evidence is available.",
  }))
  deployable.set("open_interest", snapshot({
    id: "open-interest-latest",
    artifactType: "open_interest",
    scope: {
      kind: "multi_symbol",
      symbols: openInterest.map((item) => item.symbol),
      exchange: "binance_futures",
    },
    timeframe: "1h",
    partitionKey: "open-interest/multi/1h/latest",
    source: "binance-futures-open-interest-history",
    generatedAt,
    observedAt: latestTimestamp(openInterest.map((item) => item.observedAt)),
    coverage: coverage(openInterest.length, symbols.length),
    data: openInterest,
    recordCount: openInterest.length,
    reason: openInterest.length ? undefined : "No current open-interest evidence is available.",
  }))
  deployable.set("liquidation", snapshot({
    id: "liquidation-latest",
    artifactType: "liquidation",
    scope: {
      kind: "multi_symbol",
      symbols: latestLiquidations.flatMap((item) => item.symbol ? [item.symbol] : []),
      exchange: "binance_futures",
    },
    timeframe: "1h",
    partitionKey: "liquidation/multi/1h/latest",
    source: latestLiquidations.map((item) => item.source).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "unavailable",
    generatedAt,
    observedAt: latestTimestamp(latestLiquidations.map((item) => item.symbols[0]?.lastTimestamp ?? item.window.end)),
    coverage: coverage(latestLiquidations.length, symbols.length),
    data: latestLiquidations,
    recordCount: latestLiquidations.length,
    reason: latestLiquidations.length ? undefined : "No prepared liquidation evidence is available.",
  }))
  deployable.set("exchange_flow", snapshot({
    id: "exchange-flow-latest",
    artifactType: "exchange_flow",
    scope: {
      kind: "multi_symbol",
      assets: exchangeFlow.map((item) => item.asset),
    },
    timeframe: "1d",
    partitionKey: "exchange-flow/multi/1d/latest",
    source: exchangeFlow.map((item) => item.source).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "unavailable",
    generatedAt,
    observedAt: latestTimestamp(exchangeFlow.map((item) => item.timestamp)),
    coverage: coverage(exchangeFlow.length, symbols.length),
    data: exchangeFlow,
    recordCount: exchangeFlow.length,
    reason: exchangeFlow.length ? undefined : "No prepared Exchange Flow artifacts are available.",
  }))
  deployable.set("treasury", snapshot({
    id: "treasury-latest",
    artifactType: "treasury",
    scope: {
      kind: "multi_symbol",
      assets: treasury.map((item) => item.asset),
    },
    timeframe: "1d",
    partitionKey: "treasury/multi/1d/latest",
    source: treasury.map((item) => item.source).filter((value, index, values) => values.indexOf(value) === index).join(", ") || "unavailable",
    generatedAt,
    observedAt: latestTimestamp(treasury.map((item) => item.timestamp)),
    coverage: coverage(treasury.length, symbols.length),
    data: treasury,
    recordCount: treasury.length,
    reason: treasury.length ? undefined : "No prepared Treasury artifacts are available.",
  }))

  const ohlcv = await ohlcvAvailability(symbols)
  const coverageData: DeployableCoverageIndex = {
    schemaVersion: DEPLOYABLE_SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    entries: coverageEntries({
      snapshots: deployable,
      ohlcvCoverage: coverage(ohlcv.symbols.size, symbols.length),
      ohlcvObservedAt: ohlcv.observedAt,
    }),
  }
  const coverageSnapshot = snapshot({
    id: "coverage-index",
    artifactType: "coverage_index",
    scope: { kind: "global" },
    timeframe: null,
    partitionKey: "coverage/global/latest",
    source: "deployable-snapshot-builder-v1",
    generatedAt,
    observedAt: generatedAt,
    coverage: "full",
    data: coverageData,
    recordCount: coverageData.entries.length,
  })

  const indexEntries: StandardArtifactIndex["entries"] = []
  for (const [type, value] of deployable) {
    const file = artifactName(type)
    if (!file) continue
    await writeJson(path.join(OUTPUT_ROOT, file), value)
    indexEntries.push({
      artifactType: value.metadata.artifactType,
      partitionKey: value.metadata.partitionKey,
      path: file,
      generatedAt: value.metadata.generatedAt,
      freshness: value.metadata.freshness,
      payloadSizeBytes: value.metadata.payloadSizeBytes,
      recordCount: value.metadata.recordCount,
      sourceHash: value.metadata.sourceHash,
    })
  }
  await writeJson(path.join(OUTPUT_ROOT, "coverage-index.json"), coverageSnapshot)
  indexEntries.push({
    artifactType: coverageSnapshot.metadata.artifactType,
    partitionKey: coverageSnapshot.metadata.partitionKey,
    path: "coverage-index.json",
    generatedAt: coverageSnapshot.metadata.generatedAt,
    freshness: coverageSnapshot.metadata.freshness,
    payloadSizeBytes: coverageSnapshot.metadata.payloadSizeBytes,
    recordCount: coverageSnapshot.metadata.recordCount,
    sourceHash: coverageSnapshot.metadata.sourceHash,
  })
  const artifactIndex: StandardArtifactIndex = {
    schemaVersion: 1,
    generatedAt,
    entries: indexEntries.sort((left, right) => (
      left.partitionKey.localeCompare(right.partitionKey)
    )),
  }
  await writeJson(path.join(OUTPUT_ROOT, "artifact-index.json"), artifactIndex)

  return {
    outputRoot: OUTPUT_ROOT,
    generatedAt,
    symbols,
    artifacts: [...deployable.keys()].map((type) => artifactName(type)).filter(Boolean),
    coverageIndex: "coverage-index.json",
    artifactIndex: "artifact-index.json",
  }
}

async function main() {
  const result = await buildDeployableSnapshots()
  process.stdout.write("DEPLOYABLE SNAPSHOT BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `DEPLOYABLE SNAPSHOT BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
