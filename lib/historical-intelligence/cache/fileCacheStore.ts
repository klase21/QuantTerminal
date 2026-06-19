import { randomUUID } from "node:crypto"
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import {
  HISTORICAL_CACHE_MANIFEST_VERSION,
  type HistoricalCacheFailureInput,
  type HistoricalCacheManifest,
  type HistoricalCacheReadOptions,
  type HistoricalCacheReadResult,
  type HistoricalCacheWriteInput,
  type HistoricalCacheIdentity,
} from "@/core/historical-intelligence/cache/cacheTypes"
import {
  historicalCacheEntryPath,
  historicalCacheManifestPath,
} from "@/lib/historical-intelligence/cache/cachePaths"

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isManifest(value: unknown): value is HistoricalCacheManifest {
  if (!isRecord(value)) return false
  return (
    typeof value.manifestVersion === "number"
    && isRecord(value.identity)
    && typeof value.identity.namespace === "string"
    && typeof value.identity.datasetId === "string"
    && isRecord(value.source)
    && typeof value.source.id === "string"
    && typeof value.generatedAt === "string"
    && (typeof value.expiresAt === "string" || value.expiresAt === null)
    && typeof value.schemaVersion === "string"
    && typeof value.status === "string"
    && isRecord(value.metadata)
  )
}

function isMissingFile(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT")
}

function normalizedExpiration(value: string | Date | null | undefined) {
  if (value === undefined || value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error("Historical cache expiration must be a valid date.")
  return date.toISOString()
}

function cachePayloadPath(entryPath: string, payloadFile: string) {
  const resolvedEntryPath = path.resolve(entryPath)
  const resolvedPayloadPath = path.resolve(entryPath, payloadFile)
  if (!resolvedPayloadPath.startsWith(`${resolvedEntryPath}${path.sep}`)) {
    throw new Error("Historical cache payload path escapes its cache entry.")
  }
  return resolvedPayloadPath
}

async function writeJsonAtomic(file: string, value: unknown) {
  const tempFile = `${file}.${randomUUID()}.tmp`
  await writeFile(tempFile, JSON.stringify(value), "utf8")
  await rename(tempFile, file)
}

export function isHistoricalCacheStale(
  manifest: HistoricalCacheManifest,
  now = new Date(),
) {
  if (!manifest.expiresAt) return false
  const expiresAt = Date.parse(manifest.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime()
}

export async function historicalCacheExists(identity: HistoricalCacheIdentity) {
  try {
    await access(historicalCacheManifestPath(identity))
    return true
  } catch {
    return false
  }
}

export async function readHistoricalCacheManifest<TMetadata extends Record<string, unknown> = Record<string, unknown>>(
  identity: HistoricalCacheIdentity,
): Promise<HistoricalCacheManifest<TMetadata> | null> {
  try {
    const raw = await readFile(historicalCacheManifestPath(identity), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!isManifest(parsed)) throw new Error("Historical cache manifest is invalid.")
    return parsed as HistoricalCacheManifest<TMetadata>
  } catch (error) {
    if (isMissingFile(error)) return null
    throw error
  }
}

export async function readHistoricalCache<TData, TMetadata extends Record<string, unknown> = Record<string, unknown>>(
  identity: HistoricalCacheIdentity,
  options: HistoricalCacheReadOptions = {},
): Promise<HistoricalCacheReadResult<TData, TMetadata>> {
  let manifest: HistoricalCacheManifest<TMetadata> | null
  try {
    manifest = await readHistoricalCacheManifest<TMetadata>(identity)
  } catch {
    return { ok: false, state: "corrupted", reason: "Cache manifest could not be read." }
  }

  if (!manifest) {
    return { ok: false, state: "missing", reason: "Cache entry is unavailable." }
  }
  if (manifest.manifestVersion !== HISTORICAL_CACHE_MANIFEST_VERSION) {
    return {
      ok: false,
      state: "version_mismatch",
      reason: `Cache manifest version ${manifest.manifestVersion} is not supported.`,
      manifest,
    }
  }
  if (options.expectedSchemaVersion && manifest.schemaVersion !== options.expectedSchemaVersion) {
    return {
      ok: false,
      state: "version_mismatch",
      reason: `Cache schema ${manifest.schemaVersion} does not match required schema ${options.expectedSchemaVersion}.`,
      manifest,
    }
  }
  if (manifest.status === "failed") {
    return {
      ok: false,
      state: "generation_failed",
      reason: manifest.error?.message ?? "Cache generation failed.",
      manifest,
    }
  }
  if (manifest.status !== "complete" && !(manifest.status === "partial" && options.allowPartial)) {
    return {
      ok: false,
      state: "partial",
      reason: `Cache generation status is ${manifest.status}.`,
      manifest,
    }
  }
  if (isHistoricalCacheStale(manifest, options.now) && !options.allowExpired) {
    return { ok: false, state: "expired", reason: "Cache entry has expired.", manifest }
  }
  if (!manifest.payload || manifest.payload.format !== "json") {
    return { ok: false, state: "corrupted", reason: "Cache payload descriptor is missing or unsupported.", manifest }
  }

  try {
    const entryPath = historicalCacheEntryPath(identity)
    const payloadPath = cachePayloadPath(entryPath, manifest.payload.file)
    const raw = await readFile(payloadPath, "utf8")
    return {
      ok: true,
      state: "ready",
      data: JSON.parse(raw) as TData,
      manifest,
    }
  } catch {
    return { ok: false, state: "corrupted", reason: "Cache payload could not be read.", manifest }
  }
}

export async function writeHistoricalCache<TData, TMetadata extends Record<string, unknown> = Record<string, unknown>>(
  input: HistoricalCacheWriteInput<TData, TMetadata>,
) {
  const entryPath = historicalCacheEntryPath(input.identity)
  await mkdir(entryPath, { recursive: true })

  const generatedAt = new Date().toISOString()
  const payloadFile = `payload-${randomUUID()}.json`
  const payloadPath = cachePayloadPath(entryPath, payloadFile)
  const serialized = JSON.stringify(input.data)
  await writeFile(payloadPath, serialized, "utf8")

  const manifest: HistoricalCacheManifest<TMetadata> = {
    manifestVersion: HISTORICAL_CACHE_MANIFEST_VERSION,
    identity: input.identity,
    source: input.source,
    generatedAt,
    expiresAt: normalizedExpiration(input.expiresAt),
    schemaVersion: input.schemaVersion,
    status: input.status ?? "complete",
    metadata: (input.metadata ?? {}) as TMetadata,
    payload: {
      file: payloadFile,
      format: "json",
      bytes: Buffer.byteLength(serialized),
      recordCount: input.recordCount,
    },
  }

  await writeJsonAtomic(historicalCacheManifestPath(input.identity), manifest)
  return manifest
}

export async function writeHistoricalCacheFailure<TMetadata extends Record<string, unknown> = Record<string, unknown>>(
  input: HistoricalCacheFailureInput<TMetadata>,
) {
  const entryPath = historicalCacheEntryPath(input.identity)
  await mkdir(entryPath, { recursive: true })
  const manifest: HistoricalCacheManifest<TMetadata> = {
    manifestVersion: HISTORICAL_CACHE_MANIFEST_VERSION,
    identity: input.identity,
    source: input.source,
    generatedAt: new Date().toISOString(),
    expiresAt: null,
    schemaVersion: input.schemaVersion,
    status: input.status ?? "failed",
    metadata: (input.metadata ?? {}) as TMetadata,
    payload: null,
    error: input.error,
  }
  await writeJsonAtomic(historicalCacheManifestPath(input.identity), manifest)
  return manifest
}
