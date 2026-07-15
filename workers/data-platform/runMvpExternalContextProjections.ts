import { canonicalChecksum } from "@/lib/data-platform/contracts"
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

function factDependency(row: ExternalFactRow): MvpProjectionDependency {
  return Object.freeze({
    dependencyType: "CANONICAL_FACT",
    dependencyId: row.canonical_record_id,
    dependencyVersion: String(row.record_version),
    dependencyChecksum: row.checksum,
  })
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

async function execute(command: "generate" | "recompute") {
  const owner = runtime("MIGRATION_OWNER", "mvp6a-external-projection-definition")
  const builder = runtime("PROJECTION_BUILDER", "mvp6a-external-projection-builder")
  await owner.connect()
  await builder.connect()
  try {
    await seedMvpProjectionDefinitions(owner, MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS)
    const baseProjection = await buildMacroProjection()
    const predecessors = await owner.sql.unsafe<Array<{ projection_version_id: string; projection_checksum: string }>>(
      "SELECT projection_version_id,projection_checksum FROM projection.mvp_projection_versions WHERE projection_id=$1 AND supersedes_projection_version_id IS NULL ORDER BY created_at,projection_version_id LIMIT 1",
      [baseProjection.projectionId],
    )
    const predecessor = predecessors[0]
    const projection = predecessor && predecessor.projection_checksum !== baseProjection.projectionChecksum
      ? createMvpProjection({
          kind: baseProjection.projectionKind,
          subjectId: baseProjection.subjectId,
          eventTimeStart: baseProjection.eventTimeStart,
          eventTimeEnd: baseProjection.eventTimeEnd,
          knowledgeTimeCutoff: baseProjection.knowledgeTimeCutoff,
          payload: baseProjection.structuredPayload,
          dependencies: [...baseProjection.dependencies, { dependencyType: "PROJECTION", dependencyId: baseProjection.projectionId, dependencyVersion: predecessor.projection_version_id, dependencyChecksum: predecessor.projection_checksum }],
          completeness: baseProjection.completeness,
          limitations: baseProjection.limitations,
          supersedesProjectionVersionId: predecessor.projection_version_id,
        })
      : baseProjection
    const result = await new MvpProjectionStore(builder).write(projection)
    if (result.status === "CONFLICT") throw new Error("MVP_EXTERNAL_CONTEXT_PROJECTION_CONFLICT")
    if (command === "recompute" && result.status !== "DUPLICATE") throw new Error("MVP_EXTERNAL_CONTEXT_RECOMPUTE_NOT_IDEMPOTENT")
    process.stdout.write(`${JSON.stringify({ command, status: result.status, projectionId: projection.projectionId, projectionVersionId: projection.projectionVersionId, checksum: projection.projectionChecksum, supersedesProjectionVersionId: projection.supersedesProjectionVersionId, existingCryptoProjectionsMutated: false, bitcoinEtfFlowProjection: "SOURCE_ACCESS_BLOCKED_NO_PROJECTION_CREATED" }, null, 2)}\n`)
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
    process.stdout.write(`${JSON.stringify({ projections: Object.fromEntries(rows.map((row) => [row.projection_kind, row.count])), farside: "SOURCE_ACCESS_BLOCKED" }, null, 2)}\n`)
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
