import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { SOURCE_REGISTRY } from "@/lib/data-governance/registry"

const ROOT = process.cwd()
const SCAN_ROOTS = ["app/api", "lib", "components", "workers/intelligence-tests"] as const
const CODE_EXTENSION = /\.(?:ts|tsx|js|jsx)$/

const SOURCE_ALIASES: Readonly<Record<string, readonly RegExp[]>> = {
  "binance-live": [/api\.binance\.com/i, /fapi\.binance\.com/i, /binance-(?:direct|futures)/i],
  "binance-vision": [/data\.binance\.vision/i, /binance-vision/i, /binance-historical/i],
  "upbit-live": [/api\.upbit\.com/i, /upbit-(?:public-proxy|live)/i],
  "upbit-datalab": [/datalab\.upbit\.com/i, /upbit-datalab/i],
  "bybit-live": [/api\.bybit\.com/i, /bybit-linear/i],
  cryptohftdata: [/cryptohftdata/i],
  "coinmarketcap-data-api": [/api\.coinmarketcap\.com/i, /coinmarketcap/i],
  "farside-etf": [/farside/i],
  "polymarket-gamma": [/gamma-api\.polymarket\.com/i, /polymarket/i],
  "stooq-macro": [/stooq/i],
  "gdelt-doc": [/api\.gdeltproject\.org/i, /gdelt/i],
  "regional-news": [/coindesk|cointelegraph|decrypt|coinness|jinse|wublockchain/i],
  "verified-event-catalog": [/verified-event-catalog/i],
  "etf-flow": [/etf-flow/i],
  "exchange-flow": [/exchange-flow/i],
  "treasury-snapshot": [/treasury-snapshot/i],
  "exchange-reserve": [/exchange-reserve|reserve-intelligence/i],
  "market-movers": [/market-movers/i],
  "futures-intelligence": [/futures-intelligence|futures-symbol-context/i],
  "exchange-comparison": [/exchange-comparison/i],
  "sector-rotation": [/sector-rotation|realMarketRotation|binance-upbit-real-market/i],
  "market-structure": [/market-structure|phase-27-30-market-structure/i],
  "scanner-opportunities": [/scanner\/opportunities|scanner-opportunities/i],
  news: [/\/api\/news|aggregateNews/i],
  narratives: [/\/api\/narratives|narrative/i],
  "prediction-markets": [/prediction-markets/i],
  macro: [/\/api\/macro|marketMacroClient/i],
  "historical-analog": [/historical-analog|historical-analogs/i],
  "event-impact": [/event-impact/i],
  "market-memory": [/market-memory|market_state_snapshots/i],
  "replay-cache": [/replay\/orderbook-cache|replay-cache/i],
  "data-health": [/data-health|\/api\/health/i],
}

const WATCH_TERMS = [
  { id: "coingecko", pattern: /coingecko/i, classification: "inactive_source_usage" },
  { id: "yahoo", pattern: /(?:query\d*\.finance\.yahoo|fetchYahoo|yahoo finance)/i, classification: "inactive_source_usage" },
  { id: "fred", pattern: /(?:api\.stlouisfed\.org|fetchFRED|\bFRED\b)/i, classification: "inactive_source_usage" },
] as const

interface FileRecord {
  relativePath: string
  source: string
}

async function filesBelow(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(target) : [target]
  }))
  return nested.flat()
}

function withoutCommentOnlyLines(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
}

function matchesForFile(file: FileRecord) {
  const searchable = withoutCommentOnlyLines(file.source)
  return SOURCE_REGISTRY
    .filter((entry) => searchable.includes(entry.id)
      || (SOURCE_ALIASES[entry.id] ?? []).some((pattern) => pattern.test(searchable)))
    .map((entry) => entry.id)
}

function routePath(relativePath: string) {
  const normalized = relativePath.replaceAll("\\", "/")
  return normalized
    .replace(/^app\/api/, "/api")
    .replace(/\/route\.ts$/, "")
}

export async function auditSourceRegistryUsage() {
  const absoluteFiles = (await Promise.all(SCAN_ROOTS.map((root) => filesBelow(path.join(ROOT, root)))))
    .flat()
    .filter((file) => CODE_EXTENSION.test(file))
  const files = await Promise.all(absoluteFiles.map(async (file): Promise<FileRecord> => ({
    relativePath: path.relative(ROOT, file).replaceAll("\\", "/"),
    source: await readFile(file, "utf8"),
  })))
  const usageFiles = files.filter((file) => file.relativePath !== "lib/data-governance/registry.ts"
    && file.relativePath !== "workers/intelligence-tests/auditSourceRegistryUsage.ts")

  const registeredUsage = usageFiles
    .map((file) => ({ file: file.relativePath, sourceIds: matchesForFile(file) }))
    .filter((entry) => entry.sourceIds.length > 0)

  const watchedUsage = WATCH_TERMS.flatMap((term) => usageFiles
    .filter((file) => term.pattern.test(withoutCommentOnlyLines(file.source)))
    .map((file) => ({
      term: term.id,
      classification: term.classification,
      file: file.relativePath,
    })))

  const productionMockUsage = files
    .filter((file) => (file.relativePath.startsWith("app/api/") || file.relativePath.startsWith("lib/")))
    .filter((file) => /(?:^|[\W_])mock(?:[\W_]|$)/i.test(file.relativePath)
      || /(?:^|[\W_])mock(?:[A-Z_]|[\W_]|$)/.test(withoutCommentOnlyLines(file.source)))
    .map((file) => file.relativePath)

  const routeFiles = files.filter((file) => /^app\/api\/.+\/route\.ts$/.test(file.relativePath))
  const routeMetadata = routeFiles.map((file) => {
    const source = withoutCommentOnlyLines(file.source)
    return {
      route: routePath(file.relativePath),
      file: file.relativePath,
      sourceIds: matchesForFile(file),
      metadata: {
        source: /\bsource(?:Id)?\s*[:=]/.test(source),
        freshness: /\bfreshness(?:Status)?\s*[:=]/.test(source),
        quality: /\b(?:quality|qualityLevel|dataQuality)\s*[:=]/.test(source),
        degradedReason: /\bdegradedReason\s*[:=]/.test(source),
        unavailableReason: /\b(?:unavailableReason|reason)\s*[:=]/.test(source),
      },
    }
  })

  const usedIds = new Set(registeredUsage.flatMap((entry) => entry.sourceIds))
  const registeredButUnmatched = SOURCE_REGISTRY
    .map((entry) => entry.id)
    .filter((id) => !usedIds.has(id))

  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: "REPORT_ONLY",
    scope: SCAN_ROOTS,
    counts: {
      filesScanned: files.length,
      apiRoutesScanned: routeFiles.length,
      registeredSources: SOURCE_REGISTRY.length,
      registeredSourcesMatched: usedIds.size,
      watchedFindings: watchedUsage.length,
      productionMockFindings: productionMockUsage.length,
    },
    registeredUsage,
    registeredButUnmatched,
    watchedUsage,
    productionMockUsage,
    routeMetadata,
    notes: [
      "Matches are static indicators, not proof that a source executes at runtime.",
      "Aliases are mapped to canonical registry IDs for inventory purposes only.",
      "Metadata checks detect field names in route source; they do not validate response envelopes.",
      "REPORT_ONLY findings do not enforce registry usage and do not fail this audit command.",
    ],
  }
}

async function main() {
  const report = await auditSourceRegistryUsage()
  process.stdout.write("SOURCE REGISTRY USAGE AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`SOURCE REGISTRY USAGE AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
