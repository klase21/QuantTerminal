import { readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DASHBOARD_FILE = path.join(
  process.cwd(),
  "components",
  "product",
  "DashboardV1.tsx",
)
const API_FILE = path.join(
  process.cwd(),
  "app",
  "api",
  "market-drivers",
  "route.ts",
)
const RESERVE_API_FILE = path.join(
  process.cwd(),
  "app",
  "api",
  "dashboard",
  "reserve-intelligence",
  "route.ts",
)

function position(source: string, marker: string) {
  return source.indexOf(marker)
}

export async function auditDashboardIntegration() {
  const [dashboard, api, reserveApi] = await Promise.all([
    readFile(DASHBOARD_FILE, "utf8"),
    readFile(API_FILE, "utf8"),
    readFile(RESERVE_API_FILE, "utf8"),
  ])
  const direction = position(dashboard, "<MarketDirectionPanel")
  const drivers = position(dashboard, "<WhyMarketMoving")
  const evidence = position(dashboard, "<SupportingEvidence")
  const historical = position(dashboard, "<HistoricalEvidenceStrip")
  const prediction = position(dashboard, "<PredictionMarketsCard")
  const tactical = position(dashboard, "<TacticalAlerts")
  const checks = {
    marketDirectionVisible: direction >= 0,
    driverSectionVisible: drivers >= 0,
    evidenceSectionVisible: evidence >= 0,
    historicalAnalogRemoved: historical < 0 && !dashboard.includes("/api/historical-analog"),
    predictionMarketsPreserved: prediction >= 0,
    conclusionWhyEvidenceOrder: (
      direction >= 0
      && drivers > direction
      && evidence > drivers
      && prediction > evidence
      && tactical > prediction
    ),
    marketDriverApiConnected: (
      dashboard.includes("/api/market-drivers?symbol=")
      && api.includes("buildMarketDrivers")
    ),
    reserveIntelligenceConnected: (
      dashboard.includes("/api/dashboard/reserve-intelligence?symbol=")
      && dashboard.includes("Reserve Intelligence")
      && reserveApi.includes("reserve-intelligence-latest.json")
    ),
    reserveSourceEnvelopePresent: (
      reserveApi.includes('const SOURCE_ID = "exchange-reserve"')
      && reserveApi.includes("evaluateFreshness")
      && reserveApi.includes("_source:")
    ),
    loadingStatePresent: dashboard.includes("Loading Market Direction"),
    emptyStatePresent: dashboard.includes("No Market Driver Evidence"),
    unavailableStatePresent: dashboard.includes("Market Direction Unavailable"),
  }
  const failed = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => check)
  return {
    schemaVersion: 1,
    auditedAt: new Date().toISOString(),
    readOnly: true,
    status: failed.length ? "FAIL" : "PASS",
    checks,
    failed,
  }
}

async function main() {
  const report = await auditDashboardIntegration()
  process.stdout.write("DASHBOARD INTEGRATION AUDIT\n")
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.status !== "PASS") process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(
      `DASHBOARD INTEGRATION AUDIT FAILED\n${error instanceof Error ? error.message : String(error)}\n`,
    )
    process.exitCode = 1
  })
}
