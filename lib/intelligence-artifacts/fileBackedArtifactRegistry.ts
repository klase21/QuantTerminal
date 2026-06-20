import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  DURABLE_ARTIFACT_STORE_VERSION,
  intelligenceArtifactStatus,
  validateIntelligenceArtifact,
  type DurableArtifactIndex,
  type DurableArtifactIndexEntry,
  type DurableArtifactListOptions,
  type IntelligenceArtifact,
  type IntelligenceArtifactQuery,
  type IntelligenceArtifactRegistry,
  type IntelligenceArtifactSearchResult,
  type IntelligenceArtifactStatus,
  type IntelligenceArtifactSummary,
  type IntelligenceArtifactType,
} from "@/core/intelligence-artifacts"

export const DEFAULT_DURABLE_ARTIFACT_ROOT = path.join(
  process.cwd(),
  ".data",
  "intelligence",
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function safeSegment(value: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error("Durable artifact path segments cannot be empty.")
  return encodeURIComponent(normalized).replace(/\./g, "%2E")
}

function normalized(value: string) {
  return value.trim().toLowerCase()
}

function validDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function isIndexEntry(value: unknown): value is DurableArtifactIndexEntry {
  if (!isRecord(value) || !isRecord(value.source)) return false
  return (
    value.storeVersion === DURABLE_ARTIFACT_STORE_VERSION
    && typeof value.artifactId === "string"
    && typeof value.artifactType === "string"
    && validDate(value.generatedAt)
    && (value.expiresAt === null || validDate(value.expiresAt))
    && typeof value.source.system === "string"
    && typeof value.source.producerVersion === "string"
    && typeof value.payloadPath === "string"
    && typeof value.schemaVersion === "number"
    && (value.status === "active" || value.status === "expired" || value.status === "archived")
    && Array.isArray(value.symbols)
    && value.symbols.every((symbol) => typeof symbol === "string")
  )
}

function isIndex(value: unknown): value is DurableArtifactIndex {
  return (
    isRecord(value)
    && value.storeVersion === DURABLE_ARTIFACT_STORE_VERSION
    && validDate(value.updatedAt)
    && Array.isArray(value.artifacts)
    && value.artifacts.every(isIndexEntry)
  )
}

function emptyIndex(): DurableArtifactIndex {
  return {
    storeVersion: DURABLE_ARTIFACT_STORE_VERSION,
    updatedAt: new Date(0).toISOString(),
    artifacts: [],
  }
}

function relativePayloadPath(artifact: IntelligenceArtifact) {
  return path.join(
    "artifacts",
    safeSegment(artifact.type),
    `${safeSegment(artifact.id)}.json`,
  )
}

function registryIndexPath(root: string) {
  return path.join(root, "registry", "artifact-index.json")
}

function resolvedPayloadPath(root: string, relativePath: string) {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Durable artifact payload path escapes its store root.")
  }
  return resolved
}

async function writeJsonAtomic(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true })
  const tempFile = `${file}.${randomUUID()}.tmp`
  await writeFile(tempFile, JSON.stringify(value), "utf8")
  await rename(tempFile, file)
}

async function readIndex(
  root: string,
  options: { tolerateCorruption?: boolean } = {},
): Promise<DurableArtifactIndex> {
  try {
    const raw = await readFile(registryIndexPath(root), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!isIndex(parsed)) throw new Error("Durable artifact index is invalid.")
    return parsed
  } catch (error) {
    if (isMissingFile(error)) return emptyIndex()
    if (options.tolerateCorruption) return emptyIndex()
    throw error
  }
}

function effectiveStatus(entry: DurableArtifactIndexEntry, now = new Date()): IntelligenceArtifactStatus {
  if (entry.status === "archived") return "archived"
  if (!entry.expiresAt) return "active"
  return Date.parse(entry.expiresAt) <= now.getTime() ? "expired" : "active"
}

function entryFor(
  artifact: IntelligenceArtifact,
  payloadPath: string,
): DurableArtifactIndexEntry {
  return {
    storeVersion: DURABLE_ARTIFACT_STORE_VERSION,
    artifactId: artifact.id,
    artifactType: artifact.type,
    generatedAt: artifact.generatedAt,
    expiresAt: artifact.expiresAt,
    source: artifact.source,
    payloadPath,
    schemaVersion: artifact.schemaVersion,
    status: intelligenceArtifactStatus(artifact),
    symbols: artifact.subjects?.symbols ?? [],
  }
}

function intersects(left: string[], right: string[]) {
  const expected = new Set(right.map(normalized))
  return left.some((value) => expected.has(normalized(value)))
}

function dateMatches(value: string, after?: string, before?: string) {
  const timestamp = Date.parse(value)
  if (after && timestamp < Date.parse(after)) return false
  if (before && timestamp > Date.parse(before)) return false
  return true
}

function textMatches(artifact: IntelligenceArtifact, text?: string) {
  if (!text?.trim()) return true
  const query = normalized(text)
  return [
    artifact.title,
    artifact.summary,
    artifact.type,
    artifact.source.system,
    ...(artifact.tags ?? []),
    ...(artifact.subjects?.symbols ?? []),
    ...artifact.supportingEvidence.flatMap((evidence) => [evidence.title, evidence.summary ?? ""]),
  ].some((value) => normalized(value).includes(query))
}

function summary(
  artifact: IntelligenceArtifact,
  status: IntelligenceArtifactStatus,
): IntelligenceArtifactSummary {
  return {
    id: artifact.id,
    schemaVersion: artifact.schemaVersion,
    type: artifact.type,
    title: artifact.title,
    summary: artifact.summary,
    confidence: artifact.confidence,
    source: artifact.source,
    generatedAt: artifact.generatedAt,
    expiresAt: artifact.expiresAt,
    status,
    evidenceCount: artifact.supportingEvidence.length,
    tags: artifact.tags ?? [],
    subjects: artifact.subjects ?? {},
  }
}

export class FileBackedIntelligenceArtifactRegistry implements IntelligenceArtifactRegistry {
  private mutationQueue: Promise<void> = Promise.resolve()

  constructor(readonly root: string = DEFAULT_DURABLE_ARTIFACT_ROOT) {}

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.mutationQueue.then(operation, operation)
    this.mutationQueue = result.then(() => undefined, () => undefined)
    return result
  }

  private async readArtifact(entry: DurableArtifactIndexEntry) {
    try {
      const raw = await readFile(resolvedPayloadPath(this.root, entry.payloadPath), "utf8")
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) return null
      const artifact = parsed as unknown as IntelligenceArtifact
      const validation = validateIntelligenceArtifact(artifact)
      if (
        !validation.valid
        || artifact.id !== entry.artifactId
        || artifact.type !== entry.artifactType
        || artifact.schemaVersion !== entry.schemaVersion
      ) {
        return null
      }
      return artifact
    } catch {
      return null
    }
  }

  async publish(artifact: IntelligenceArtifact) {
    const validation = validateIntelligenceArtifact(artifact)
    if (!validation.valid) {
      throw new Error(`Invalid intelligence artifact: ${validation.errors.join(" ")}`)
    }

    return this.enqueue(async () => {
      const index = await readIndex(this.root)
      const existing = index.artifacts.find((entry) => entry.artifactId === artifact.id)
      const payloadPath = relativePayloadPath(artifact)
      await writeJsonAtomic(resolvedPayloadPath(this.root, payloadPath), artifact)

      const nextEntry = entryFor(artifact, payloadPath)
      index.artifacts = [
        ...index.artifacts.filter((entry) => entry.artifactId !== artifact.id),
        nextEntry,
      ].sort((left, right) => left.artifactId.localeCompare(right.artifactId))
      index.updatedAt = new Date().toISOString()
      await writeJsonAtomic(registryIndexPath(this.root), index)

      return {
        artifact: structuredClone(artifact),
        replaced: Boolean(existing),
      }
    })
  }

  async get(id: string) {
    const index = await readIndex(this.root, { tolerateCorruption: true })
    const entry = index.artifacts.find((candidate) => candidate.artifactId === id)
    if (!entry) return null
    const artifact = await this.readArtifact(entry)
    return artifact ? structuredClone(artifact) : null
  }

  async archive(id: string) {
    return this.enqueue(async () => {
      const index = await readIndex(this.root)
      const entry = index.artifacts.find((candidate) => candidate.artifactId === id)
      if (!entry) return false
      entry.status = "archived"
      index.updatedAt = new Date().toISOString()
      await writeJsonAtomic(registryIndexPath(this.root), index)
      return true
    })
  }

  async isArchived(id: string) {
    const index = await readIndex(this.root, { tolerateCorruption: true })
    return index.artifacts.some((entry) => (
      entry.artifactId === id && entry.status === "archived"
    ))
  }

  async list(options: DurableArtifactListOptions = {}) {
    const index = await readIndex(this.root, { tolerateCorruption: true })
    const artifacts: IntelligenceArtifact[] = []
    for (const entry of index.artifacts) {
      const status = effectiveStatus(entry)
      if (!options.includeExpired && status === "expired") continue
      if (!options.includeArchived && status === "archived") continue
      const artifact = await this.readArtifact(entry)
      if (artifact) artifacts.push(artifact)
    }
    return artifacts
  }

  async listByType(
    type: IntelligenceArtifactType,
    options: DurableArtifactListOptions = {},
  ) {
    const artifacts = await this.list(options)
    return artifacts.filter((artifact) => artifact.type === type)
  }

  async listBySymbol(symbol: string, options: DurableArtifactListOptions = {}) {
    const expected = normalized(symbol)
    const artifacts = await this.list(options)
    return artifacts.filter((artifact) => (
      (artifact.subjects?.symbols ?? []).some((candidate) => normalized(candidate) === expected)
    ))
  }

  async listBySource(sourceSystem: string, options: DurableArtifactListOptions = {}) {
    const expected = normalized(sourceSystem)
    const artifacts = await this.list(options)
    return artifacts.filter((artifact) => normalized(artifact.source.system) === expected)
  }

  async search(query: IntelligenceArtifactQuery = {}): Promise<IntelligenceArtifactSearchResult> {
    const offset = Math.max(0, query.offset ?? 0)
    const limit = Math.max(1, Math.min(500, query.limit ?? 50))
    const index = await readIndex(this.root, { tolerateCorruption: true })
    const ids = query.ids ? new Set(query.ids) : null
    const types = query.types ? new Set(query.types) : null
    const sourceSystems = query.sourceSystems?.map(normalized)
    const symbols = query.symbols?.map(normalized)

    const candidates = index.artifacts.filter((entry) => {
      const status = effectiveStatus(entry)
      if (ids && !ids.has(entry.artifactId)) return false
      if (types && !types.has(entry.artifactType)) return false
      if (sourceSystems && !sourceSystems.includes(normalized(entry.source.system))) return false
      if (symbols && !intersects(entry.symbols, symbols)) return false
      if (!dateMatches(entry.generatedAt, query.generatedAfter, query.generatedBefore)) return false
      if (!query.includeExpired && status === "expired") return false
      if (!query.includeArchived && status === "archived") return false
      return true
    })

    const matches: Array<{
      artifact: IntelligenceArtifact
      status: IntelligenceArtifactStatus
    }> = []
    for (const entry of candidates) {
      const artifact = await this.readArtifact(entry)
      if (!artifact) continue
      if (
        query.exchanges
        && !intersects(artifact.subjects?.exchanges ?? [], query.exchanges)
      ) continue
      if (query.tags && !intersects(artifact.tags ?? [], query.tags)) continue
      if (
        query.minimumConfidence !== undefined
        && artifact.confidence < query.minimumConfidence
      ) continue
      if (!textMatches(artifact, query.text)) continue
      matches.push({ artifact, status: effectiveStatus(entry) })
    }

    matches.sort((left, right) => (
      Date.parse(right.artifact.generatedAt) - Date.parse(left.artifact.generatedAt)
      || right.artifact.confidence - left.artifact.confidence
      || left.artifact.id.localeCompare(right.artifact.id)
    ))

    return {
      artifacts: matches
        .slice(offset, offset + limit)
        .map(({ artifact, status }) => summary(artifact, status)),
      total: matches.length,
      offset,
      limit,
    }
  }
}
