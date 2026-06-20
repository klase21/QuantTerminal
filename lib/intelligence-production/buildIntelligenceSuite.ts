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
  type IntelligenceProductionStage,
  type IntelligenceProductionStageResult,
  type IntelligenceProductionStageStatus,
} from "@/core/intelligence-production"
import {
  createEventImpactArtifact,
  createHistoricalAnalogArtifact,
  type IntelligenceArtifact,
} from "@/core/intelligence-artifacts"
import { createMarketMemoryArtifact } from "@/core/market-memory"
import {
  productionIntelligenceArtifactReader,
  productionIntelligenceArtifactRegistry,
} from "@/lib/intelligence-artifacts/productionRegistry"
import { buildMarketMemoryCatalog } from "@/lib/market-memory/buildMarketMemoryCatalog"
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
  if (failed === stages.length) return "failed"
  if (failed > 0 || succeeded < stages.length) return "partial"
  return "succeeded"
}

export async function buildIntelligenceSuite(
  input: IntelligenceSuiteBuildInput = DEFAULT_INPUT,
): Promise<IntelligenceProductionReport> {
  const suiteStarted = Date.now()
  const preparedArtifacts: IntelligenceArtifact[] = []
  const stages: IntelligenceProductionStageResult[] = []

  stages.push(await executeStage("historical_analog", async () => {
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
  }))

  stages.push(await executeStage("event_impact", async () => {
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
  }))

  stages.push(await executeStage("market_memory", async () => {
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
  }))

  stages.push(await executeStage("artifact_publication", async () => {
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
        await productionIntelligenceArtifactRegistry.publish(artifact)
        const read = await productionIntelligenceArtifactReader.read(artifact.id)
        if (!read.ok) {
          throw new Error("reason" in read ? read.reason : `Artifact read failed: ${read.state}`)
        }
        outputs.push({
          kind: "artifact",
          id: artifact.id,
          metadata: { state: "published", type: artifact.type },
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
  }))

  const completed = Date.now()
  return {
    schemaVersion: INTELLIGENCE_PRODUCTION_SCHEMA_VERSION,
    status: suiteStatus(stages),
    startedAt: new Date(suiteStarted).toISOString(),
    completedAt: new Date(completed).toISOString(),
    totalDuration: completed - suiteStarted,
    stages,
    outputsGenerated: stages.reduce((total, stage) => total + stage.outputs.length, 0),
    warningCount: stages.reduce((total, stage) => total + stage.warnings.length, 0),
    failureCount: stages.reduce((total, stage) => total + stage.errors.length, 0),
  }
}

export function intelligenceProductionStageOrder() {
  return [...INTELLIGENCE_PRODUCTION_STAGES]
}
