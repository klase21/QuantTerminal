import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  DURABLE_ARTIFACT_STORE_VERSION,
  type DurableArtifactIndex,
  type IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"
import type {
  IntelligenceProductionRunSummary,
  IntelligenceSchedulerSkipRecord,
  IntelligenceSchedulerState,
} from "@/core/intelligence-production"
import {
  DEFAULT_DURABLE_ARTIFACT_ROOT,
} from "@/lib/intelligence-artifacts/fileBackedArtifactRegistry"
import {
  FileIntelligenceProductionRunReportStore,
  summarizeIntelligenceProductionRun,
} from "./productionRunReportStore"
import {
  DEFAULT_INTELLIGENCE_SCHEDULER_ROOT,
  FileIntelligenceSchedulerStore,
} from "./intelligenceSchedulerStore"

type StoreHealth = "healthy" | "empty" | "unavailable"

export interface IntelligenceOperationsSnapshot {
  checkedAt: string
  production: {
    latestRun: IntelligenceProductionRunSummary | null
    latestSuccessfulRun: IntelligenceProductionRunSummary | null
    recentRuns: IntelligenceProductionRunSummary[]
  }
  scheduler: {
    state: IntelligenceSchedulerState | null
    locked: boolean
    lastSkip: IntelligenceSchedulerSkipRecord | null
  }
  artifactInventory: {
    historicalAnalog: number
    eventImpact: number
    replayEvidence: number
    marketMemory: number
  }
  stores: {
    artifactStore: StoreHealth
    runReportStore: StoreHealth
    schedulerState: StoreHealth
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function validArtifactIndex(value: unknown): value is DurableArtifactIndex {
  return (
    isRecord(value)
    && value.storeVersion === DURABLE_ARTIFACT_STORE_VERSION
    && typeof value.updatedAt === "string"
    && Array.isArray(value.artifacts)
    && value.artifacts.every((entry) => (
      isRecord(entry)
      && typeof entry.artifactId === "string"
      && typeof entry.artifactType === "string"
      && typeof entry.generatedAt === "string"
      && typeof entry.payloadPath === "string"
      && typeof entry.schemaVersion === "number"
      && typeof entry.status === "string"
    ))
  )
}

async function readArtifactIndexMetadata() {
  const file = path.join(
    DEFAULT_DURABLE_ARTIFACT_ROOT,
    "registry",
    "artifact-index.json",
  )
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"))
    if (!validArtifactIndex(parsed)) {
      return { health: "unavailable" as const, index: null }
    }
    return {
      health: parsed.artifacts.length ? "healthy" as const : "empty" as const,
      index: parsed,
    }
  } catch (error) {
    if (isMissingFile(error)) return { health: "empty" as const, index: null }
    return { health: "unavailable" as const, index: null }
  }
}

function artifactCount(index: DurableArtifactIndex | null, type: IntelligenceArtifactType) {
  if (!index) return 0
  return index.artifacts.filter((entry) => entry.artifactType === type).length
}

async function lockExists() {
  try {
    const parsed: unknown = JSON.parse(await readFile(
      path.join(DEFAULT_INTELLIGENCE_SCHEDULER_ROOT, "production.lock"),
      "utf8",
    ))
    return (
      isRecord(parsed)
      && typeof parsed.expiresAt === "string"
      && Date.parse(parsed.expiresAt) > Date.now()
    )
  } catch (error) {
    if (isMissingFile(error)) return false
    return false
  }
}

export async function readIntelligenceOperationsSnapshot(): Promise<IntelligenceOperationsSnapshot> {
  const reportStore = new FileIntelligenceProductionRunReportStore()
  const schedulerStore = new FileIntelligenceSchedulerStore()

  const artifactResultPromise = readArtifactIndexMetadata()
  const reportPromise = Promise.all([
    reportStore.getLatestRun(),
    reportStore.getLatestSuccessfulRun(),
    reportStore.listRecentRuns(10),
  ]).then(([latest, latestSuccessful, recent]) => ({
    health: recent.length ? "healthy" as const : "empty" as const,
    latest,
    latestSuccessful,
    recent,
  })).catch(() => ({
    health: "unavailable" as const,
    latest: null,
    latestSuccessful: null,
    recent: [],
  }))
  const schedulerPromise = Promise.all([
    schedulerStore.readState(),
    schedulerStore.readLastSkip(),
    lockExists(),
  ]).then(([state, lastSkip, locked]) => ({
    health: state ? "healthy" as const : "empty" as const,
    state,
    lastSkip,
    locked,
  })).catch(() => ({
    health: "unavailable" as const,
    state: null,
    lastSkip: null,
    locked: false,
  }))

  const [artifactResult, reportResult, schedulerResult] = await Promise.all([
    artifactResultPromise,
    reportPromise,
    schedulerPromise,
  ])

  return {
    checkedAt: new Date().toISOString(),
    production: {
      latestRun: reportResult.latest
        ? summarizeIntelligenceProductionRun(reportResult.latest)
        : null,
      latestSuccessfulRun: reportResult.latestSuccessful
        ? summarizeIntelligenceProductionRun(reportResult.latestSuccessful)
        : null,
      recentRuns: reportResult.recent.map(summarizeIntelligenceProductionRun),
    },
    scheduler: {
      state: schedulerResult.state,
      locked: schedulerResult.locked,
      lastSkip: schedulerResult.lastSkip,
    },
    artifactInventory: {
      historicalAnalog: artifactCount(artifactResult.index, "historical_analog"),
      eventImpact: artifactCount(artifactResult.index, "event_impact"),
      replayEvidence: artifactCount(artifactResult.index, "replay_intelligence"),
      marketMemory: artifactCount(artifactResult.index, "market_memory"),
    },
    stores: {
      artifactStore: artifactResult.health,
      runReportStore: reportResult.health,
      schedulerState: schedulerResult.health,
    },
  }
}
