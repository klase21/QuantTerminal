import path from "node:path"

import type { VerifiedEventCategory } from "@/core/event-catalog"
import {
  EVENT_IMPACT_CACHE_SCHEMA_VERSION,
  eventImpactCategoryCacheIdentity,
} from "@/core/event-impact"
import {
  HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
  historicalAnalogCacheIdentity,
} from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import type { CanonicalExchange } from "@/core/historical-intelligence/market-data"
import {
  INTELLIGENCE_PRODUCTION_SCHEMA_VERSION,
  INTELLIGENCE_PRODUCTION_STAGES,
  type IntelligenceProductionMessage,
  type IntelligenceProductionOutput,
  type IntelligenceProductionReport,
  type IntelligenceProductionRunReport,
  type IntelligenceProductionRunReportStore,
  type IntelligenceProductionStage,
  type IntelligenceProductionStageResult,
  type IntelligenceProductionStageStatus,
} from "@/core/intelligence-production"
import {
  createEventImpactArtifact,
  createHistoricalAnalogArtifact,
  IntelligenceArtifactReader,
  type IntelligenceArtifact,
  type IntelligenceArtifactRegistry,
} from "@/core/intelligence-artifacts"
import { createMarketMemoryArtifact } from "@/core/market-memory"
import {
  productionIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/productionRegistry"
import { buildMarketMemoryCatalog } from "@/lib/market-memory/buildMarketMemoryCatalog"
import {
  FileIntelligenceProductionRunReportStore,
  createIntelligenceProductionRunId,
} from "@/lib/intelligence-production/productionRunReportStore"
import {
  buildEventImpactCache,
  type EventImpactCacheBuildInput,
} from "@/workers/event-impact/buildEventImpactCache"
import {
  buildHistoricalAnalogCacheV2,
  type HistoricalAnalogCacheBuildInput,
} from "@/workers/historical-intelligence/buildHistoricalAnalogCache"

export interface IntelligenceSuiteBuildInput {
  historicalAnalog: HistoricalAnalogCacheBuildInput
  eventImpact: EventImpactCacheBuildInput
}

export interface IntelligenceSuiteBuildOptions {
  artifactRegistry?: IntelligenceArtifactRegistry
  publicationTarget?: string
  reportStore?: IntelligenceProductionRunReportStore
  runId?: string
}

interface StageExecution {
  status?: IntelligenceProductionStageStatus
  outputs?: IntelligenceProductionOutput[]
  warnings?: IntelligenceProductionMessage[]
  errors?: IntelligenceProductionMessage[]
}

const DEFAULT_INPUT: IntelligenceSuiteBuildInput = {
  historicalAnalog: {
    file: path.join(process.cwd(), ".data", "historical", "market_ohlcv.json"),
    symbol: "BTCUSDT",
    interval: "1h",
    limit: 25,
  },
  eventImpact: {
    category: "macro" as VerifiedEventCategory,
    symbol: "BTCUSDT",
    exchange: "binance_futures" as CanonicalExchange,
  },
}

function cacheIdentity(identity: {
  namespace: string
  datasetId: string
  partition?: Record<string, string | number | boolean>
}) {
  const partition = Object.entries(identity.partition ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("/")
  return `${identity.namespace}/${identity.datasetId}${partition ? `/${partition}` : ""}`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function executeStage(
  stage: IntelligenceProductionStage,
  execute: () => Promise<StageExecution>,
): Promise<IntelligenceProductionStageResult> {
  const started = Date.now()
  const startedAt = new Date(started).toISOString()
  try {
    const result = await execute()
    const completed = Date.now()
    return {
      schemaVersion: INTELLIGENCE_PRODUCTION_SCHEMA_VERSION,
      stage,
      status: result.status ?? "succeeded",
      startedAt,
      completedAt: new Date(completed).toISOString(),
      duration: completed - started,
      outputs: result.outputs ?? [],
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
    }
  } catch (error) {
    const completed = Date.now()
    return {
      schemaVersion: INTELLIGENCE_PRODUCTION_SCHEMA_VERSION,
      stage,
      status: "failed",
      startedAt,
      completedAt: new Date(completed).toISOString(),
      duration: completed - started,
      outputs: [],
      warnings: [],
      errors: [{
        code: `${stage}_failed`,
        message: errorMessage(error),
      }],
    }
  }
}

function suiteStatus(stages: IntelligenceProductionStageResult[]): IntelligenceProductionStageStatus {
  const succeeded = stages.filter((stage) => stage.status === "succeeded").length
  const failed = stages.filter((stage) => stage.status === "failed").length
  const partial = stages.filter((stage) => stage.status === "partial").length
  const skipped = stages.filter((stage) => stage.status === "skipped").length
  if (succeeded === 0 && partial === 0 && failed > 0) return "failed"
  if (skipped === stages.length) return "skipped"
  if (failed > 0 || succeeded < stages.length) return "partial"
  return "succeeded"
}

function initialRunReport(runId: string, startedAt: string): IntelligenceProductionRunReport {
  return {
    schemaVersion: 1,
    runId,
    startedAt,
    completedAt: null,
    duration: 0,
    overallStatus: "running",
    stages: INTELLIGENCE_PRODUCTION_STAGES.map((stage) => ({
      stage,
      status: "pending",
      startedAt: null,
      completedAt: null,
      duration: 0,
      outputs: [],
      warnings: [],
      errors: [],
    })),
  }
}

export async function buildIntelligenceSuite(
  input: IntelligenceSuiteBuildInput = DEFAULT_INPUT,
  options: IntelligenceSuiteBuildOptions = {},
): Promise<IntelligenceProductionReport> {
  const suiteStarted = Date.now()
  const preparedArtifacts: IntelligenceArtifact[] = []
  const stages: IntelligenceProductionStageResult[] = []
  const artifactRegistry = options.artifactRegistry ?? productionIntelligenceArtifactRegistry
  const artifactReader = new IntelligenceArtifactReader(artifactRegistry)
  const publicationTarget = options.publicationTarget ?? "in-memory"
  const reportStore = options.reportStore ?? new FileIntelligenceProductionRunReportStore()
  const runReport = initialRunReport(
    options.runId ?? createIntelligenceProductionRunId(new Date(suiteStarted)),
    new Date(suiteStarted).toISOString(),
  )

  const persistStageStart = async (stage: IntelligenceProductionStage) => {
    const reportStage = runReport.stages.find((candidate) => candidate.stage === stage)
    if (!reportStage) throw new Error(`Production report stage ${stage} is unavailable.`)
    reportStage.status = "running"
    reportStage.startedAt = new Date().toISOString()
    runReport.duration = Date.now() - suiteStarted
    await reportStore.writeRun(runReport)
  }

  const persistStageResult = async (result: IntelligenceProductionStageResult) => {
    const reportStage = runReport.stages.find((candidate) => candidate.stage === result.stage)
    if (!reportStage) throw new Error(`Production report stage ${result.stage} is unavailable.`)
    reportStage.status = result.status
    reportStage.startedAt = result.startedAt
    reportStage.completedAt = result.completedAt
    reportStage.duration = result.duration
    reportStage.outputs = result.outputs
    reportStage.warnings = result.warnings
    reportStage.errors = result.errors
    runReport.duration = Date.now() - suiteStarted
    await reportStore.writeRun(runReport)
  }

  const runStage = async (
    stage: IntelligenceProductionStage,
    execute: () => Promise<StageExecution>,
  ) => {
    await persistStageStart(stage)
    const result = await executeStage(stage, execute)
    stages.push(result)
    await persistStageResult(result)
    return result
  }

  await reportStore.writeRun(runReport)

  await runStage("historical_analog", async () => {
    const result = await buildHistoricalAnalogCacheV2(input.historicalAnalog)
    const identity = historicalAnalogCacheIdentity({
      symbol: result.payload.symbol,
      interval: result.payload.interval,
    })
    const artifact = createHistoricalAnalogArtifact({
      payload: result.payload,
      generatedAt: result.job.completedAt ?? new Date().toISOString(),
      cacheIdentity: cacheIdentity(identity),
      cacheSchemaVersion: HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
    })
    preparedArtifacts.push(artifact)
    return {
      outputs: [
        {
          kind: "cache",
          id: cacheIdentity(identity),
          metadata: {
            currentStateId: result.payload.currentState.id,
            analogCount: result.payload.cases.length,
          },
        },
        {
          kind: "artifact",
          id: artifact.id,
          metadata: { state: "prepared" },
        },
      ],
    }
  })

  await runStage("event_impact", async () => {
    const result = await buildEventImpactCache(input.eventImpact)
    const identity = eventImpactCategoryCacheIdentity({
      category: result.categoryPayload.category,
      symbol: result.categoryPayload.symbol,
      exchange: result.categoryPayload.exchange,
    })
    const artifact = createEventImpactArtifact({
      payload: result.categoryPayload,
      cacheIdentity: cacheIdentity(identity),
      cacheSchemaVersion: EVENT_IMPACT_CACHE_SCHEMA_VERSION,
    })
    preparedArtifacts.push(artifact)
    return {
      outputs: [
        {
          kind: "cache",
          id: cacheIdentity(identity),
          metadata: {
            sampleCount: result.categoryPayload.result.sampleCount,
            eventCacheCount: result.eventPayloads.length,
          },
        },
        {
          kind: "artifact",
          id: artifact.id,
          metadata: { state: "prepared" },
        },
      ],
    }
  })

  await runStage("market_memory", async () => {
    if (!preparedArtifacts.length) {
      return {
        status: "skipped",
        warnings: [{
          code: "market_memory_no_artifacts",
          message: "Market Memory was skipped because no upstream intelligence artifacts were prepared.",
        }],
      }
    }

    const catalog = buildMarketMemoryCatalog(preparedArtifacts)
    const memoryArtifacts = catalog.memories.map(createMarketMemoryArtifact)
    preparedArtifacts.push(...memoryArtifacts)
    return {
      outputs: [
        {
          kind: "catalog",
          id: `market-memory-catalog:${catalog.catalogVersion}`,
          metadata: {
            generatedAt: catalog.generatedAt,
            memoryCount: catalog.memories.length,
          },
        },
        ...catalog.memories.map((memory) => ({
          kind: "memory" as const,
          id: memory.memoryId,
          metadata: { memoryType: memory.memoryType },
        })),
        ...memoryArtifacts.map((artifact) => ({
          kind: "artifact" as const,
          id: artifact.id,
          metadata: { state: "prepared" },
        })),
      ],
    }
  })

  await runStage("artifact_publication", async () => {
    if (!preparedArtifacts.length) {
      return {
        status: "skipped",
        warnings: [{
          code: "artifact_publication_no_artifacts",
          message: "Artifact publication was skipped because no artifacts were prepared.",
        }],
      }
    }

    const outputs: IntelligenceProductionOutput[] = []
    const errors: IntelligenceProductionMessage[] = []
    for (const artifact of preparedArtifacts) {
      try {
        await artifactRegistry.publish(artifact)
        const read = await artifactReader.read(artifact.id)
        if (!read.ok) {
          throw new Error("reason" in read ? read.reason : `Artifact read failed: ${read.state}`)
        }
        outputs.push({
          kind: "artifact",
          id: artifact.id,
          metadata: {
            state: "published",
            type: artifact.type,
            target: publicationTarget,
          },
        })
      } catch (error) {
        errors.push({
          code: "artifact_publication_failed",
          message: `${artifact.id}: ${errorMessage(error)}`,
        })
      }
    }

    return {
      status: errors.length === 0
        ? "succeeded"
        : outputs.length > 0
          ? "partial"
          : "failed",
      outputs,
      errors,
    }
  })

  const completed = Date.now()
  const status = suiteStatus(stages)
  const report: IntelligenceProductionReport = {
    schemaVersion: INTELLIGENCE_PRODUCTION_SCHEMA_VERSION,
    status,
    startedAt: new Date(suiteStarted).toISOString(),
    completedAt: new Date(completed).toISOString(),
    totalDuration: completed - suiteStarted,
    stages,
    outputsGenerated: stages.reduce((total, stage) => total + stage.outputs.length, 0),
    warningCount: stages.reduce((total, stage) => total + stage.warnings.length, 0),
    failureCount: stages.reduce((total, stage) => total + stage.errors.length, 0),
  }
  runReport.completedAt = report.completedAt
  runReport.duration = report.totalDuration
  runReport.overallStatus = status
  await reportStore.writeRun(runReport)
  return report
}

export function intelligenceProductionStageOrder() {
  return [...INTELLIGENCE_PRODUCTION_STAGES]
}
