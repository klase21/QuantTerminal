import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
  liquidationEvidenceCacheIdentity,
  liquidationEvidenceId,
  liquidationEvidenceWindow,
  readLiquidationEvidence,
  type LiquidationEvidence,
  type LiquidationEvidenceCacheMetadata,
  type LiquidationEvidenceCoordinates,
  type LiquidationSymbolSnapshot,
} from "@/core/liquidation-intelligence"
import { writeHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"
import {
  loadCryptoHftDataLiquidations,
  type ReplayLiquidation,
} from "@/lib/replay/cryptoHftDataClient"

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function required(name: string, fallback?: string) {
  const value = argument(name) ?? fallback
  if (!value?.trim()) throw new Error(`Missing required --${name} argument.`)
  return value.trim()
}

function validateHour(value: string) {
  const hour = Number(value)
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("hour must be an integer from 0 through 23.")
  }
  return hour
}

function validNotional(event: ReplayLiquidation) {
  return event.notional !== null
    && Number.isFinite(event.notional)
    && event.notional >= 0
}

function snapshot(symbol: string, events: ReplayLiquidation[]): LiquidationSymbolSnapshot {
  const usable = events.filter(validNotional)
  const longLiquidation = usable
    .filter((item) => item.side === "long")
    .reduce((sum, item) => sum + item.notional!, 0)
  const shortLiquidation = usable
    .filter((item) => item.side === "short")
    .reduce((sum, item) => sum + item.notional!, 0)
  const unknownLiquidation = usable
    .filter((item) => item.side === "unknown")
    .reduce((sum, item) => sum + item.notional!, 0)
  return {
    symbol,
    longLiquidation,
    shortLiquidation,
    unknownLiquidation,
    totalLiquidation: longLiquidation + shortLiquidation + unknownLiquidation,
    eventCount: usable.length,
    firstTimestamp: usable.at(0)?.timestamp ?? null,
    lastTimestamp: usable.at(-1)?.timestamp ?? null,
  }
}

function totals(symbols: LiquidationSymbolSnapshot[]) {
  return symbols.reduce(
    (result, item) => ({
      longLiquidation: result.longLiquidation + item.longLiquidation,
      shortLiquidation: result.shortLiquidation + item.shortLiquidation,
      unknownLiquidation: result.unknownLiquidation + item.unknownLiquidation,
      totalLiquidation: result.totalLiquidation + item.totalLiquidation,
      eventCount: result.eventCount + item.eventCount,
    }),
    {
      longLiquidation: 0,
      shortLiquidation: 0,
      unknownLiquidation: 0,
      totalLiquidation: 0,
      eventCount: 0,
    },
  )
}

async function writeEvidence(
  coordinates: LiquidationEvidenceCoordinates,
  evidence: LiquidationEvidence,
) {
  const metadata: LiquidationEvidenceCacheMetadata = {
    scope: evidence.scope,
    symbol: evidence.symbol,
    source: evidence.source,
    sourceQuality: evidence.sourceQuality,
    eventCount: evidence.totals.eventCount,
    symbolCount: evidence.symbols.length,
    totalLiquidation: evidence.totals.totalLiquidation,
  }
  return writeHistoricalCache({
    identity: liquidationEvidenceCacheIdentity(coordinates),
    source: {
      id: evidence.source,
      kind: evidence.scope === "symbol" ? "enrichment" : "derived",
    },
    schemaVersion: LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
    data: evidence,
    metadata,
    expiresAt: null,
    status: evidence.sourceQuality === "verified" ? "complete" : "partial",
    recordCount: evidence.totals.eventCount,
  })
}

export async function buildSymbolLiquidationEvidence(input: {
  exchange: string
  symbol: string
  date: string
  hour: number
}) {
  const coordinates: LiquidationEvidenceCoordinates = {
    exchange: input.exchange.trim().toLowerCase(),
    symbol: input.symbol.trim().toUpperCase(),
    date: input.date,
    hour: input.hour,
    scope: "symbol",
  }
  const provider = await loadCryptoHftDataLiquidations({
    exchange: coordinates.exchange,
    symbol: coordinates.symbol!,
    date: coordinates.date,
    hour: coordinates.hour,
  })
  if (!provider.ok) {
    throw new Error(provider.reason ?? "Liquidation evidence source is unavailable.")
  }
  const symbolSnapshot = snapshot(coordinates.symbol!, provider.events)
  const invalidEvents = provider.events.length - symbolSnapshot.eventCount
  const unknownEvents = provider.events.filter((item) => item.side === "unknown").length
  const sourceQuality = invalidEvents > 0 || unknownEvents > 0
    ? "degraded" as const
    : "verified" as const
  const generatedAt = new Date().toISOString()
  const evidence: LiquidationEvidence = {
    schemaVersion: 1,
    evidenceId: liquidationEvidenceId(coordinates),
    scope: "symbol",
    exchange: coordinates.exchange,
    symbol: coordinates.symbol!,
    window: liquidationEvidenceWindow(coordinates.date, coordinates.hour),
    source: provider.source,
    sourceQuality,
    generatedAt,
    totals: totals([symbolSnapshot]),
    symbols: [symbolSnapshot],
    reason: sourceQuality === "degraded"
      ? `${invalidEvents} event(s) lacked usable notional and ${unknownEvents} event(s) had unknown side.`
      : undefined,
  }
  const manifest = await writeEvidence(coordinates, evidence)
  return { evidence, manifest, providerDiagnostics: provider.diagnostics }
}

export async function buildMarketWideLiquidationEvidence(input: {
  exchange: string
  symbols: string[]
  date: string
  hour: number
}) {
  const exchange = input.exchange.trim().toLowerCase()
  const symbols = [...new Set(input.symbols.map((item) => item.trim().toUpperCase()).filter(Boolean))]
  if (!symbols.length) throw new Error("Market-wide evidence requires at least one explicit symbol.")
  const snapshots: LiquidationSymbolSnapshot[] = []
  const unavailable: string[] = []
  for (const symbol of symbols) {
    const result = await readLiquidationEvidence({
      exchange,
      symbol,
      date: input.date,
      hour: input.hour,
      scope: "symbol",
    })
    if (!result.ok) {
      unavailable.push(`${symbol}: ${"reason" in result ? result.reason : result.state}`)
      continue
    }
    snapshots.push(...result.data.symbols)
  }
  if (!snapshots.length) {
    throw new Error("No prepared symbol liquidation evidence exists for the market-wide window.")
  }
  const coordinates: LiquidationEvidenceCoordinates = {
    exchange,
    date: input.date,
    hour: input.hour,
    scope: "market-wide",
  }
  const evidence: LiquidationEvidence = {
    schemaVersion: 1,
    evidenceId: liquidationEvidenceId(coordinates),
    scope: "market-wide",
    exchange,
    symbol: null,
    window: liquidationEvidenceWindow(input.date, input.hour),
    source: "prepared-symbol-liquidation-evidence",
    sourceQuality: "degraded",
    generatedAt: new Date().toISOString(),
    totals: totals(snapshots),
    symbols: snapshots.sort((left, right) => left.symbol.localeCompare(right.symbol)),
    reason: unavailable.length
      ? `Explicit symbol universe is incomplete: ${unavailable.join(" ")}`
      : `Market-wide snapshot covers the explicit ${symbols.length}-symbol universe only; global market completeness is not established.`,
  }
  const manifest = await writeEvidence(coordinates, evidence)
  return { evidence, manifest, unavailableSymbols: unavailable }
}

function loadLocalEnvironment() {
  if (process.env.CRYPTOHFTDATA_API_KEY) return
  try {
    process.loadEnvFile(path.join(process.cwd(), ".env.local"))
  } catch {
    // Provider availability is validated by the existing client.
  }
}

async function main() {
  loadLocalEnvironment()
  const scope = required("scope", "symbol")
  const exchange = required("exchange", "binance_futures")
  const date = required("date")
  const hour = validateHour(required("hour"))
  const result = scope === "market-wide"
    ? await buildMarketWideLiquidationEvidence({
        exchange,
        date,
        hour,
        symbols: required("symbols").split(","),
      })
    : await buildSymbolLiquidationEvidence({
        exchange,
        symbol: required("symbol"),
        date,
        hour,
      })
  process.stdout.write("LIQUIDATION EVIDENCE BUILD\n")
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `LIQUIDATION EVIDENCE BUILD FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
