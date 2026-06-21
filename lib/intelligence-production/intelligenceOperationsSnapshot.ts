import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  DURABLE_ARTIFACT_STORE_VERSION,
  type DurableArtifactIndex,
  type IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"
import {
  EVIDENCE_COVERAGE_STATUSES,
  EVIDENCE_FRESHNESS_STATUSES,
  isEvidenceValidity,
  type EvidenceCoverageStatus,
  type EvidenceFreshnessStatus,
} from "@/core/evidence-validity"
import type {
  IntelligenceProductionRunSummary,
  IntelligenceSchedulerSkipRecord,
  IntelligenceSchedulerState,
} from "@/core/intelligence-production"
import {
  ARTIFACT_DISCOVERY_CATEGORIES,
  createArtifactDiscoveryRecord,
  artifactDiscoveryCategoryForType,
  type ArtifactDiscoveryCategory,
} from "@/core/artifact-discovery"
import {
  MEMORY_ELIGIBILITY_STATUSES,
  evaluateMemoryEligibility,
  type MemoryEligibilityStatus,
} from "@/core/memory-eligibility"
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
    replayLearning: number
    marketMemory: number
  }
  artifactDiscovery: {
    total: number
    categories: Record<ArtifactDiscoveryCategory, number>
  }
  memoryEligibility: {
    groups: number
    statuses: Record<MemoryEligibilityStatus, number>
  }
  artifactValidity: {
    freshness: Record<EvidenceFreshnessStatus, number>
    coverage: Record<EvidenceCoverageStatus, number>
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

async function readArtifactIndexMetadata(root: string) {
  const file = path.join(
    root,
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

function artifactValidityCounts(index: DurableArtifactIndex | null) {
  const freshness = Object.fromEntries(
    EVIDENCE_FRESHNESS_STATUSES.map((status) => [status, 0]),
  ) as Record<EvidenceFreshnessStatus, number>
  const coverage = Object.fromEntries(
    EVIDENCE_COVERAGE_STATUSES.map((status) => [status, 0]),
  ) as Record<EvidenceCoverageStatus, number>

  for (const entry of index?.artifacts ?? []) {
    if (isEvidenceValidity(entry.validity)) {
      freshness[entry.validity.freshnessStatus] += 1
      coverage[entry.validity.coverageStatus] += 1
    } else {
      freshness.UNKNOWN += 1
      coverage.UNKNOWN += 1
    }
  }
  return { freshness, coverage }
}

function artifactDiscoveryCounts(index: DurableArtifactIndex | null) {
  const categories = Object.fromEntries(
    ARTIFACT_DISCOVERY_CATEGORIES.map((category) => [category, 0]),
  ) as Record<ArtifactDiscoveryCategory, number>

  for (const entry of index?.artifacts ?? []) {
    categories[artifactDiscoveryCategoryForType(entry.artifactType)] += 1
  }
  return {
    total: index?.artifacts.length ?? 0,
    categories,
  }
}

function memoryEligibilityCounts(
  index: DurableArtifactIndex | null,
  evaluatedAt: string,
) {
  const statuses = Object.fromEntries(
    MEMORY_ELIGIBILITY_STATUSES.map((status) => [status, 0]),
  ) as Record<MemoryEligibilityStatus, number>
  const records = evaluateMemoryEligibility(
    (index?.artifacts ?? []).map((entry) => ({
      discovery: createArtifactDiscoveryRecord({
        id: entry.artifactId,
        schemaVersion: entry.schemaVersion,
        type: entry.artifactType,
        title: entry.artifactId,
        summary: "",
        confidence: 0,
        source: entry.source,
        generatedAt: entry.generatedAt,
        expiresAt: entry.expiresAt,
        validity: isEvidenceValidity(entry.validity)
          ? entry.validity
          : {
              schemaVersion: 1,
              observedAt: null,
              generatedAt: entry.generatedAt,
              freshnessStatus: "UNKNOWN",
              coverageStatus: "UNKNOWN",
            },
        status: entry.status,
        evidenceCount: 0,
        tags: [],
        subjects: { symbols: entry.symbols },
      }, evaluatedAt),
      coverageStatus: isEvidenceValidity(entry.validity)
        ? entry.validity.coverageStatus
        : "UNKNOWN",
    })),
    evaluatedAt,
  )
  for (const record of records) statuses[record.eligibilityStatus] += 1
  return { groups: records.length, statuses }
}

async function lockExists(root: string) {
  try {
    const parsed: unknown = JSON.parse(await readFile(
      path.join(root, "production.lock"),
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

export async function readIntelligenceOperationsSnapshot(
  roots: {
    artifactRoot?: string
    reportRoot?: string
    schedulerRoot?: string
  } = {},
): Promise<IntelligenceOperationsSnapshot> {
  const checkedAt = new Date().toISOString()
  const artifactRoot = roots.artifactRoot ?? DEFAULT_DURABLE_ARTIFACT_ROOT
  const reportStore = new FileIntelligenceProductionRunReportStore(roots.reportRoot)
  const schedulerRoot = roots.schedulerRoot ?? DEFAULT_INTELLIGENCE_SCHEDULER_ROOT
  const schedulerStore = new FileIntelligenceSchedulerStore(schedulerRoot)

  const artifactResultPromise = readArtifactIndexMetadata(artifactRoot)
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
    lockExists(schedulerRoot),
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
    checkedAt,
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
      replayLearning: artifactCount(artifactResult.index, "replay_learning"),
      marketMemory: artifactCount(artifactResult.index, "market_memory"),
    },
    artifactDiscovery: artifactDiscoveryCounts(artifactResult.index),
    memoryEligibility: memoryEligibilityCounts(artifactResult.index, checkedAt),
    artifactValidity: artifactValidityCounts(artifactResult.index),
    stores: {
      artifactStore: artifactResult.health,
      runReportStore: reportResult.health,
      schedulerState: schedulerResult.health,
    },
  }
}
