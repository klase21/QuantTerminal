import {
  ConsistencyPostgresRuntime,
  MvpProjectionStore,
  seedMvpProjectionDefinitions,
  type D4Environment,
} from "@/lib/data-platform/consistency-evidence/postgres"
import {
  createMvpProjection,
  MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS,
  type MvpProjectionDependency,
} from "@/lib/data-platform/evidence-platform"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"

type Command = "generate" | "recompute" | "status"

function argument(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length)
}

function environment(): D4Environment {
  return {
    D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL,
    D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL,
    D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  }
}

function runtime(roleIntent: "MIGRATION_OWNER" | "PROJECTION_BUILDER" | "READ_ONLY", applicationName: string) {
  const env = environment()
  if (!env.D4_ISOLATED_POSTGRES_URL) throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED")
  return new ConsistencyPostgresRuntime({
    connectionString: env.D4_ISOLATED_POSTGRES_URL,
    roleIntent,
    maxConnections: 1,
    connectTimeoutSeconds: 10,
    idleTimeoutSeconds: 30,
    statementTimeoutMs: 30_000,
    applicationName,
    environment: env,
  })
}

interface ExternalFactRow {
  readonly fact_id: string
  readonly canonical_record_id: string
  readonly record_version: number
  readonly provider_id: string
  readonly series_id: string
  readonly subject: string
  readonly value: string
  readonly unit: string
  readonly period: string
  readonly effective_at: Date
  readonly checksum: string
  readonly recorded_at: Date
}

interface EtfFactRow {
  readonly fact_id: string
  readonly canonical_record_id: string
  readonly record_version: number
  readonly provider_id: string
  readonly instrument_id: string
  readonly flow_value: string
  readonly currency: string
  readonly window_start: Date
  readonly window_end: Date
  readonly checksum: string
  readonly recorded_at: Date
}

function factDependency(row: ExternalFactRow): MvpProjectionDependency {
  return Object.freeze({
    dependencyType: "CANONICAL_FACT",
    dependencyId: row.canonical_record_id,
    dependencyVersion: String(row.record_version),
    dependencyChecksum: row.checksum,
  })
}

function etfFactDependency(row: EtfFactRow): MvpProjectionDependency {
  return Object.freeze({ dependencyType: "CANONICAL_FACT", dependencyId: row.canonical_record_id, dependencyVersion: String(row.record_version), dependencyChecksum: row.checksum })
}

function sumIntegerStrings(rows: readonly EtfFactRow[]): string {
  return rows.reduce((total, row) => total + BigInt(row.flow_value), BigInt(0)).toString()
}

async function buildMacroProjection() {
  const clients = await createIntegratedBackfillClientsFromEnvironment({
    repositoryRoot: process.cwd(),
    d2: { roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp6a-external-projection-d2" },
    d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp6a-external-projection-d3" },
  })
  try {
    const [facts, coverage] = await Promise.all([
      clients.d2.sql.unsafe<ExternalFactRow[]>(
        "SELECT fact_id,canonical_record_id,record_version,provider_id,series_id,subject,value::text,unit,period,effective_at,checksum,recorded_at FROM canonical.macro_observations WHERE provider_id IN ('fred','alpha-vantage') AND series_id IN ('DGS10','SPY') ORDER BY provider_id,series_id,effective_at",
      ),
      clients.d3.sql.unsafe<Array<{ decision_id: string; provider_id: string }>>(
        "SELECT decision_id,provider_id FROM coverage.watermark_eligibility_decisions WHERE provider_id IN ('fred','alpha-vantage') AND eligibility_result='ELIGIBLE' ORDER BY provider_id,decision_id",
      ),
    ])
    const fred = facts.filter((row) => row.provider_id === "fred" && row.series_id === "DGS10")
    const spy = facts.filter((row) => row.provider_id === "alpha-vantage" && row.series_id === "SPY")
    if (!fred.length || !spy.length || coverage.length !== 2) throw new Error("MVP_EXTERNAL_CONTEXT_INPUTS_INCOMPLETE")
    const latestFred = fred.at(-1)!
    const latestSpy = spy.at(-1)!
    const spyFiveDayStart = spy.at(-5) ?? spy[0]!
    const spyFiveDayReturnPct = ((Number(latestSpy.value) / Number(spyFiveDayStart.value)) - 1) * 100
    const start = [fred[0]!.effective_at, spy[0]!.effective_at].map((value) => value.toISOString()).sort()[0]!
    const end = [latestFred.effective_at, latestSpy.effective_at].map((value) => value.toISOString()).sort().at(-1)!
    const knowledgeTimeCutoff = facts.map((row) => row.recorded_at.toISOString()).sort().at(-1)!.replace(/\.\d{3}Z$/, ".000Z")
    const dependencies: MvpProjectionDependency[] = [
      ...facts.map(factDependency),
      ...coverage.map((row) => ({ dependencyType: "COVERAGE_DECISION" as const, dependencyId: row.decision_id, dependencyVersion: null, dependencyChecksum: null })),
    ]
    return createMvpProjection({
      kind: "MacroContextProjection",
      subjectId: "GLOBAL_MACRO_CONTEXT",
      eventTimeStart: start,
      eventTimeEnd: end,
      knowledgeTimeCutoff,
      dependencies,
      completeness: "COMPLETE_WITH_LIMITATION",
      limitations: [
        "DAILY_CONTEXT_NOT_REALTIME",
        "DOLLAR_CONTEXT_ROLE_PENDING",
        "SHORT_RATE_ROLE_PENDING",
        "YIELD_CURVE_ROLE_PENDING",
        "POLICY_RATE_ROLE_PENDING",
        "FED_LIQUIDITY_ROLE_PENDING",
        "COMMODITY_CONTEXT_ROLE_PENDING",
        "PUBLIC_DEMO_LICENSE_REVIEW_REQUIRED",
      ],
      payload: {
        classification: "MIXED",
        cryptoAssessmentRelationship: "NEUTRAL_SUPPLEMENTAL_CONTEXT",
        frequency: "DAILY",
        ratesContext: {
          state: "AVAILABLE",
          role: "US_LONG_TERM_TREASURY_YIELD",
          seriesId: "DGS10",
          value: latestFred.value,
          unit: latestFred.unit,
          observationDate: latestFred.period,
        },
        equityRiskContext: {
          state: "AVAILABLE",
          role: "BROAD_US_EQUITY_MARKET_CONTEXT",
          symbol: "SPY",
          close: latestSpy.value,
          currency: latestSpy.unit,
          fiveTradingDayReturnPct: spyFiveDayReturnPct,
          observationDate: latestSpy.period,
        },
        unavailableRoles: [
          "US_SHORT_TERM_TREASURY_YIELD",
          "TREASURY_YIELD_CURVE_SPREAD",
          "BROAD_US_DOLLAR_CONTEXT",
          "FEDERAL_RESERVE_POLICY_RATE",
          "FEDERAL_RESERVE_LIQUIDITY",
          "US_TECHNOLOGY_RISK_APPETITE",
          "GOLD_CONTEXT",
          "CRUDE_OIL_CONTEXT",
          "MAJOR_USD_FX_CONTEXT",
        ],
        coverage: { fredDgs10: "COMPLETE_BOUNDED_CANARY", alphaVantageSpy: "COMPLETE_BOUNDED_CANARY" },
        sourceReferences: facts.map((row) => ({ provider: row.provider_id, seriesId: row.series_id, factId: row.fact_id, checksum: row.checksum })),
        sourcePublicationState: "PENDING",
        methodologyVersion: "mvp-external-context/1.0.0",
      },
    })
  } finally {
    await clients.shutdown()
  }
}

async function buildBitcoinEtfFlowProjection() {
  const clients = await createIntegratedBackfillClientsFromEnvironment({
    repositoryRoot: process.cwd(),
    d2: { roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp6a-etf-projection-d2" },
    d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp6a-etf-projection-d3" },
  })
  try {
    const totals = await clients.d2.sql.unsafe<EtfFactRow[]>(
      "SELECT fact_id,canonical_record_id,record_version,provider_id,instrument_id,flow_value::text,currency,window_start,window_end,checksum,recorded_at FROM canonical.etf_observations WHERE provider_id='farside-investors' AND instrument_id='TOTAL' ORDER BY window_start DESC LIMIT 20",
    )
    if (totals.length < 5) throw new Error("MVP_ETF_PROJECTION_INSUFFICIENT_HISTORY")
    const latestTotal = totals[0]!
    const latestFunds = await clients.d2.sql.unsafe<EtfFactRow[]>(
      "SELECT fact_id,canonical_record_id,record_version,provider_id,instrument_id,flow_value::text,currency,window_start,window_end,checksum,recorded_at FROM canonical.etf_observations WHERE provider_id='farside-investors' AND window_start=$1 AND instrument_id<>'TOTAL' ORDER BY instrument_id",
      [latestTotal.window_start],
    )
    const coverage = await clients.d3.sql.unsafe<Array<{ decision_id: string }>>(
      "SELECT decision_id FROM coverage.watermark_eligibility_decisions WHERE dataset_id='etf-flow' AND provider_id='farside-investors' AND eligibility_result='ELIGIBLE' ORDER BY created_at DESC,decision_id DESC LIMIT 1",
    )
    if (!coverage[0]) throw new Error("MVP_ETF_PROJECTION_COVERAGE_MISSING")
    const latestPositive = [...latestFunds].filter((row) => BigInt(row.flow_value) > BigInt(0)).sort((left, right) => Number(BigInt(right.flow_value) - BigInt(left.flow_value)))[0] ?? null
    const latestNegative = [...latestFunds].filter((row) => BigInt(row.flow_value) < BigInt(0)).sort((left, right) => Number(BigInt(left.flow_value) - BigInt(right.flow_value)))[0] ?? null
    const fiveDayTotal = sumIntegerStrings(totals.slice(0, 5))
    const twentyDayTotal = totals.length >= 20 ? sumIntegerStrings(totals.slice(0, 20)) : null
    const relationship = BigInt(fiveDayTotal) > BigInt(0) ? "SUPPORTIVE" : BigInt(fiveDayTotal) < BigInt(0) ? "OPPOSING" : "NEUTRAL"
    const dependencies = [
      ...totals.map(etfFactDependency),
      ...latestFunds.map(etfFactDependency),
      { dependencyType: "COVERAGE_DECISION" as const, dependencyId: coverage[0].decision_id, dependencyVersion: null, dependencyChecksum: null },
    ]
    const ordered = [...totals].sort((left, right) => left.window_start.getTime() - right.window_start.getTime())
    const knowledgeTimeCutoff = [...totals, ...latestFunds].map((row) => row.recorded_at.toISOString()).sort().at(-1)!.replace(/\.\d{3}Z$/, ".000Z")
    return createMvpProjection({
      kind: "BitcoinEtfFlowProjection",
      subjectId: "BTC_SPOT_ETF_US",
      eventTimeStart: ordered[0]!.window_start.toISOString(),
      eventTimeEnd: latestTotal.window_end.toISOString(),
      knowledgeTimeCutoff,
      dependencies,
      completeness: totals.length >= 20 ? "COMPLETE" : "COMPLETE_WITH_LIMITATION",
      limitations: ["DAILY_NOT_REALTIME", "OBSERVED_FLOW_IS_NOT_ESTIMATED_DEMAND", "MISSING_FUND_VALUE_IS_NOT_ZERO"],
      payload: {
        classification: relationship,
        cryptoAssessmentRelationship: `${relationship}_SUPPLEMENTAL_CONTEXT`,
        frequency: "DAILY",
        unit: "USD",
        sourceUnit: "USD_MILLIONS",
        observationDate: latestTotal.window_start.toISOString().slice(0, 10),
        latestDailyTotalUsd: latestTotal.flow_value,
        fiveTradingDayTotalUsd: fiveDayTotal,
        twentyTradingDayTotalUsd: twentyDayTotal,
        leadingPositiveContributor: latestPositive ? { fundId: latestPositive.instrument_id, flowUsd: latestPositive.flow_value } : null,
        leadingNegativeContributor: latestNegative ? { fundId: latestNegative.instrument_id, flowUsd: latestNegative.flow_value } : null,
        coverage: "COMPLETE_BOUNDED_SOURCE_TABLE",
        sourceAvailability: "PUBLICLY_AVAILABLE",
        representation: "HTML_EMBEDDED_TABLE",
        acquisition: "BROWSER_BACKED_SCHEDULED_RETRIEVAL",
        sourceReferences: [...totals, ...latestFunds].map((row) => ({ provider: row.provider_id, fundId: row.instrument_id, factId: row.fact_id, checksum: row.checksum })),
        sourcePublicationState: "PENDING",
        methodologyVersion: "mvp-bitcoin-etf-flow/1.0.0",
      },
    })
  } finally {
    await clients.shutdown()
  }
}

async function execute(command: "generate" | "recompute") {
  const owner = runtime("MIGRATION_OWNER", "mvp6a-external-projection-definition")
  const builder = runtime("PROJECTION_BUILDER", "mvp6a-external-projection-builder")
  await owner.connect()
  await builder.connect()
  try {
    await seedMvpProjectionDefinitions(owner, MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS)
    const kind = argument("kind")
    if (kind !== "macro" && kind !== "etf") throw new Error("MVP_EXTERNAL_CONTEXT_PROJECTION_KIND_REQUIRED:--kind=macro|etf")
    const projections = kind === "macro" ? [await buildMacroProjection()] : [await buildBitcoinEtfFlowProjection()]
    const outputs = []
    const store = new MvpProjectionStore(builder)
    for (const projection of projections) {
      const result = await store.write(projection)
      if (result.status === "CONFLICT") throw new Error("MVP_EXTERNAL_CONTEXT_PROJECTION_CONFLICT")
      if (command === "recompute" && result.status !== "DUPLICATE") throw new Error("MVP_EXTERNAL_CONTEXT_RECOMPUTE_NOT_IDEMPOTENT")
      outputs.push({ projectionKind: projection.projectionKind, status: result.status, projectionId: projection.projectionId, projectionVersionId: projection.projectionVersionId, checksum: projection.projectionChecksum, exposure: projection.consumerExposureState })
    }
    process.stdout.write(`${JSON.stringify({ command, projections: outputs, existingCryptoProjectionsMutated: false }, null, 2)}\n`)
  } finally {
    await builder.shutdown()
    await owner.shutdown()
  }
}

async function status() {
  const reader = runtime("READ_ONLY", "mvp6a-external-projection-status")
  await reader.connect()
  try {
    const rows = await reader.sql.unsafe<Array<{ projection_kind: string; count: number }>>(
      "SELECT projection_kind,count(*)::int count FROM projection.mvp_projection_versions WHERE projection_kind IN ('MacroContextProjection','BitcoinEtfFlowProjection') GROUP BY projection_kind ORDER BY projection_kind",
    )
    process.stdout.write(`${JSON.stringify({ projections: Object.fromEntries(rows.map((row) => [row.projection_kind, row.count])), farside: "PUBLICLY_AVAILABLE_BROWSER_BACKED" }, null, 2)}\n`)
  } finally {
    await reader.shutdown()
  }
}

async function main() {
  const command = (process.argv[2] ?? "status") as Command
  if (command === "status") return status()
  if (command === "generate" || command === "recompute") return execute(command)
  throw new Error(`Unsupported command: ${command}`)
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "MVP_EXTERNAL_CONTEXT_PROJECTION_FAILED"}\n`)
  process.exitCode = 1
})
