import type {
  DataSourceDefinition,
  SourceRegistryValidationIssue,
  SourceRegistryValidationResult,
} from "@/lib/data-governance/types"

function source(definition: DataSourceDefinition): DataSourceDefinition {
  return Object.freeze({
    ...definition,
    consumers: Object.freeze([...definition.consumers]),
  })
}

export const SOURCE_REGISTRY: readonly DataSourceDefinition[] = Object.freeze([
  source({ id: "binance-live", displayName: "Binance Live", authority: "Binance public Spot and Futures REST/WebSocket", owner: "markets", consumers: ["dashboard", "markets", "scanner", "replay", "trade"], cacheable: true, criticality: "P0", quality: "HIGH", freshness: "LIVE", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "binance-vision", displayName: "Binance Vision", authority: "Binance public historical archive", owner: "data_platform", consumers: ["research", "replay", "operations"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "coinalyze-internal-web", displayName: "Coinalyze Internal Web", authority: "Coinalyze publicly visible chart datafeed; experimental supplemental evidence only", owner: "data_platform", consumers: ["research", "replay", "operations"], cacheable: true, criticality: "P2", quality: "LOW", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "upbit-live", displayName: "Upbit Live", authority: "Upbit public REST/WebSocket", owner: "markets", consumers: ["markets", "scanner"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "LIVE", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "upbit-datalab", displayName: "Upbit DataLab", authority: "Upbit DataLab public endpoints", owner: "markets", consumers: ["markets", "research"], cacheable: true, criticality: "P2", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "bybit-live", displayName: "Bybit Live", authority: "Bybit public linear market REST/WebSocket", owner: "markets", consumers: ["markets"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "LIVE", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "cryptohftdata", displayName: "CryptoHFTData", authority: "CryptoHFTData authenticated historical downloads", owner: "replay", consumers: ["research", "replay"], cacheable: true, criticality: "P0", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "coinmarketcap-data-api", displayName: "CoinMarketCap Data API", authority: "CoinMarketCap public data-api and compatible contracts", owner: "data_platform", consumers: ["dashboard", "markets", "research", "operations"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "farside-etf", displayName: "Farside ETF Tables", authority: "Farside Investors public BTC and ETH ETF tables", owner: "data_platform", consumers: ["dashboard", "markets", "research"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "coinmarketcap-data-api", productionApproved: true }),
  source({ id: "polymarket-gamma", displayName: "Polymarket Gamma", authority: "Polymarket Gamma public API", owner: "research", consumers: ["dashboard", "research"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "stooq-macro", displayName: "Stooq Macro", authority: "Stooq public CSV quotes", owner: "research", consumers: ["dashboard", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "gdelt-doc", displayName: "GDELT DOC", authority: "GDELT DOC API", owner: "research", consumers: ["dashboard", "research"], cacheable: true, criticality: "P2", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "regional-news", productionApproved: true }),
  source({ id: "regional-news", displayName: "Regional News Feeds", authority: "CoinDesk, Cointelegraph, Decrypt, Coinness, and Jinse feeds", owner: "research", consumers: ["dashboard", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "saveticker", displayName: "SaveTicker", authority: "SaveTicker public news API", owner: "research", consumers: ["research"], cacheable: false, criticality: "P2", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "verified-event-catalog", displayName: "Verified Event Catalog", authority: "Curated records linked to authoritative event sources", owner: "research", consumers: ["research", "replay"], cacheable: true, criticality: "P1", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),

  source({ id: "etf-flow", displayName: "ETF Flow", authority: "QuantTerminal normalized ETF flow", owner: "data_platform", consumers: ["dashboard", "markets", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "coinmarketcap-data-api", productionApproved: true }),
  source({ id: "exchange-flow", displayName: "Exchange Flow", authority: "QuantTerminal normalized CoinMarketCap exchange flow", owner: "data_platform", consumers: ["dashboard", "markets"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "treasury-snapshot", displayName: "Treasury Snapshot", authority: "QuantTerminal normalized CoinMarketCap treasury snapshot", owner: "data_platform", consumers: ["dashboard", "markets", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "exchange-reserve", displayName: "Exchange Reserve", authority: "QuantTerminal Binance reserve snapshots and retained deltas", owner: "data_platform", consumers: ["dashboard", "markets", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "market-movers", displayName: "Market Movers", authority: "QuantTerminal Binance Futures market-mover derivation", owner: "scanner", consumers: ["dashboard", "markets", "scanner", "trade"], cacheable: true, criticality: "P0", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "futures-intelligence", displayName: "Futures Intelligence", authority: "QuantTerminal Binance derivatives aggregation", owner: "markets", consumers: ["dashboard", "markets", "scanner", "trade"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "exchange-comparison", displayName: "Exchange Comparison", authority: "QuantTerminal Binance and Bybit venue comparison", owner: "markets", consumers: ["markets"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "sector-rotation", displayName: "Sector Rotation", authority: "QuantTerminal Binance, Upbit, and DataLab rotation model", owner: "markets", consumers: ["dashboard", "markets", "scanner"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "market-structure", displayName: "Market Structure", authority: "QuantTerminal structure derivation", owner: "markets", consumers: ["markets", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "sector-rotation", productionApproved: true }),
  source({ id: "scanner-opportunities", displayName: "Scanner Opportunities", authority: "QuantTerminal Scanner prioritization", owner: "scanner", consumers: ["scanner", "research"], cacheable: false, criticality: "P0", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "market-movers", productionApproved: true }),
  source({ id: "news", displayName: "News", authority: "QuantTerminal regional news aggregation", owner: "research", consumers: ["dashboard", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "regional-news", productionApproved: true }),
  source({ id: "narratives", displayName: "Narratives", authority: "QuantTerminal narrative tagging and heatmap", owner: "research", consumers: ["dashboard", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "regional-news", productionApproved: true }),
  source({ id: "prediction-markets", displayName: "Prediction Markets", authority: "QuantTerminal normalized Polymarket context", owner: "research", consumers: ["dashboard", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "polymarket-gamma", productionApproved: true }),
  source({ id: "macro", displayName: "Macro", authority: "QuantTerminal normalized Stooq macro context", owner: "research", consumers: ["dashboard", "scanner", "research"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "stooq-macro", productionApproved: true }),
  source({ id: "historical-analog", displayName: "Historical Analog", authority: "QuantTerminal canonical historical states and outcomes", owner: "replay", consumers: ["research", "replay"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
  source({ id: "event-impact", displayName: "Event Impact", authority: "QuantTerminal verified event and outcome impact", owner: "research", consumers: ["research", "replay"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "verified-event-catalog", productionApproved: true }),
  source({ id: "market-memory", displayName: "Market Memory", authority: "QuantTerminal durable historical memory", owner: "research", consumers: ["research", "replay"], cacheable: true, criticality: "P1", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "historical-analog", productionApproved: true }),
  source({ id: "replay-cache", displayName: "Replay Cache", authority: "QuantTerminal window-specific Replay evidence cache", owner: "replay", consumers: ["replay", "trade"], cacheable: true, criticality: "P0", quality: "MEDIUM", freshness: "CURRENT", status: "ACTIVE", fallbackSource: "binance-live", productionApproved: true }),
  source({ id: "data-health", displayName: "Data Health", authority: "QuantTerminal artifact and coverage validation", owner: "data_platform", consumers: ["dashboard", "markets", "scanner", "research", "replay", "trade", "operations"], cacheable: true, criticality: "P0", quality: "HIGH", freshness: "CURRENT", status: "ACTIVE", fallbackSource: null, productionApproved: true }),
])

const SOURCE_BY_ID = new Map(SOURCE_REGISTRY.map((entry) => [entry.id, entry]))

export function getSource(id: string): DataSourceDefinition | undefined {
  return SOURCE_BY_ID.get(id)
}

export function listSources(): readonly DataSourceDefinition[] {
  return [...SOURCE_REGISTRY]
}

export function listActiveSources(): readonly DataSourceDefinition[] {
  return SOURCE_REGISTRY.filter((entry) => entry.status === "ACTIVE")
}

export function listProductionSources(): readonly DataSourceDefinition[] {
  return SOURCE_REGISTRY.filter((entry) => entry.productionApproved)
}

export function validateSourceRegistry(
  sources: readonly Partial<DataSourceDefinition>[] = SOURCE_REGISTRY,
): SourceRegistryValidationResult {
  const issues: SourceRegistryValidationIssue[] = []
  const counts = new Map<string, number>()

  for (const entry of sources) {
    const id = typeof entry.id === "string" ? entry.id.trim() : ""
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    if (!entry.owner) {
      issues.push({ code: "missing_owner", message: `Source ${id || "<unknown>"} has no owner.`, sourceId: id || undefined })
    }
    if (typeof entry.authority !== "string" || !entry.authority.trim()) {
      issues.push({ code: "missing_authority", message: `Source ${id || "<unknown>"} has no authority.`, sourceId: id || undefined })
    }
    if (!entry.productionApproved || entry.status === "DISABLED") {
      issues.push({ code: "inactive_production_source", message: `Source ${id || "<unknown>"} is not active and production-approved.`, sourceId: id || undefined })
    }
  }

  for (const [id, count] of counts) {
    if (count > 1) issues.push({ code: "duplicate_id", message: `Source ID ${id} appears ${count} times.`, sourceId: id })
  }

  const unique = new Map<string, Partial<DataSourceDefinition>>()
  for (const entry of sources) {
    if (typeof entry.id === "string" && !unique.has(entry.id)) unique.set(entry.id, entry)
  }

  for (const entry of unique.values()) {
    if (!entry.fallbackSource) continue
    if (!unique.has(entry.fallbackSource)) {
      issues.push({
        code: "missing_fallback_source",
        message: `Fallback ${entry.fallbackSource} for ${entry.id} is not registered.`,
        sourceId: entry.id,
        relatedSourceId: entry.fallbackSource,
      })
    }
  }

  const reportedLoops = new Set<string>()
  for (const entry of unique.values()) {
    if (!entry.id) continue
    const path: string[] = []
    const positions = new Map<string, number>()
    let cursor: Partial<DataSourceDefinition> | undefined = entry

    while (cursor?.id) {
      const repeatedAt = positions.get(cursor.id)
      if (repeatedAt !== undefined) {
        const cycle = [...path.slice(repeatedAt), cursor.id]
        const key = [...new Set(cycle)].sort().join("|")
        if (!reportedLoops.has(key)) {
          reportedLoops.add(key)
          issues.push({
            code: "fallback_loop",
            message: `Fallback loop detected: ${cycle.join(" -> ")}.`,
            sourceId: entry.id,
            relatedSourceId: cursor.id,
          })
        }
        break
      }

      positions.set(cursor.id, path.length)
      path.push(cursor.id)
      cursor = cursor.fallbackSource ? unique.get(cursor.fallbackSource) : undefined
    }
  }

  return {
    valid: issues.length === 0,
    sourceCount: sources.length,
    productionSourceCount: sources.filter((entry) => entry.productionApproved).length,
    issues,
  }
}

export const SOURCE_REGISTRY_VALIDATION = Object.freeze(validateSourceRegistry())
