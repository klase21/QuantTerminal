import { createHash, randomUUID } from "node:crypto"
import { open, mkdir, readFile, rename, rm, stat, statfs } from "node:fs/promises"
import os from "node:os"
import path from "node:path"

import type { ObjectStoragePort, RawArtifactReference } from "@/lib/data-platform/population/contracts"

interface ArtifactSidecar { readonly contentHash: string; readonly byteLength: number; readonly mediaType: string }
export interface FilesystemObjectStorageOptions { readonly root: string; readonly repositoryRoot: string; readonly createRoot: boolean; readonly testAuthorization?: "ALLOW_D3_TEST_TEMP_ROOT" }
export interface FilesystemTargetInspection { readonly safe: boolean; readonly resolvedRoot: string; readonly reasons: readonly string[]; readonly availableBytes: number | null }

function inside(parent: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate))
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
}

export async function inspectFilesystemObjectRoot(options: FilesystemObjectStorageOptions): Promise<FilesystemTargetInspection> {
  const reasons: string[] = []
  const resolvedRoot = path.resolve(options.root)
  if (!path.isAbsolute(options.root)) reasons.push("OBJECT_ROOT_NOT_ABSOLUTE")
  if (inside(options.repositoryRoot, resolvedRoot)) reasons.push("OBJECT_ROOT_INSIDE_REPOSITORY")
  if (inside(os.tmpdir(), resolvedRoot) && options.testAuthorization !== "ALLOW_D3_TEST_TEMP_ROOT") reasons.push("OBJECT_ROOT_INSIDE_TEMP_DIRECTORY")
  if (/password|passwd|secret|token|apikey|api_key/i.test(resolvedRoot)) reasons.push("OBJECT_ROOT_CONTAINS_CREDENTIAL_MARKER")
  try {
    if (options.createRoot) await mkdir(resolvedRoot, { recursive: true })
    const info = await stat(resolvedRoot)
    if (!info.isDirectory()) reasons.push("OBJECT_ROOT_NOT_DIRECTORY")
  } catch { reasons.push("OBJECT_ROOT_UNAVAILABLE") }
  let availableBytes: number | null = null
  if (reasons.length === 0) {
    try { const value = await statfs(resolvedRoot); availableBytes = Number(value.bavail) * Number(value.bsize) } catch { reasons.push("OBJECT_ROOT_CAPACITY_UNAVAILABLE") }
  }
  return Object.freeze({ safe: reasons.length === 0, resolvedRoot, reasons: Object.freeze(reasons), availableBytes })
}

function safeKey(root: string, key: string): string {
  if (!key || key.includes("\\") || key.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("OBJECT_KEY_INVALID")
  const target = path.resolve(root, ...key.split("/"))
  if (!inside(root, target) || target === path.resolve(root)) throw new Error("OBJECT_KEY_ESCAPES_ROOT")
  return target
}

async function readSidecar(filename: string): Promise<ArtifactSidecar | null> {
  try {
    const value = JSON.parse(await readFile(`${filename}.metadata.json`, "utf8")) as Partial<ArtifactSidecar>
    return typeof value.contentHash === "string" && typeof value.byteLength === "number" && typeof value.mediaType === "string" ? value as ArtifactSidecar : null
  } catch { return null }
}

async function inspectExistingFile(filename: string): Promise<{ readonly contentHash: string; readonly byteLength: number } | null> {
  let handle
  try { handle = await open(filename, "r") } catch { return null }
  const hash = createHash("sha256"); let byteLength = 0
  try { for await (const chunk of handle.createReadStream({ highWaterMark: 64 * 1024 })) { hash.update(chunk); byteLength += chunk.length } } finally { await handle.close() }
  return Object.freeze({ contentHash: hash.digest("hex"), byteLength })
}

async function publishSidecar(target: string, metadata: ArtifactSidecar): Promise<void> {
  const metadataTemp = `${target}.metadata.${randomUUID()}.partial`
  const metadataHandle = await open(metadataTemp, "wx")
  try { await metadataHandle.writeFile(JSON.stringify(metadata)); await metadataHandle.sync() } finally { await metadataHandle.close() }
  try { await rename(metadataTemp, `${target}.metadata.json`) } catch (cause) {
    await rm(metadataTemp, { force: true })
    const concurrent = await readSidecar(target)
    if (!concurrent || concurrent.contentHash !== metadata.contentHash || concurrent.byteLength !== metadata.byteLength || concurrent.mediaType !== metadata.mediaType) throw cause
  }
}

export async function createFilesystemObjectStorage(options: FilesystemObjectStorageOptions): Promise<ObjectStoragePort> {
  const inspection = await inspectFilesystemObjectRoot(options)
  if (!inspection.safe) throw new Error(`UNSAFE_OBJECT_ROOT:${inspection.reasons.join(",")}`)
  const root = inspection.resolvedRoot
  return Object.freeze({
    async putImmutable(input): Promise<RawArtifactReference> {
      if (!/^[a-f0-9]{64}$/.test(input.contentHash) || !Number.isSafeInteger(input.byteLength) || input.byteLength < 0) throw new Error("ARTIFACT_METADATA_INVALID")
      if (!input.objectStorageKey.includes(input.contentHash)) throw new Error("ARTIFACT_KEY_HASH_MISMATCH")
      const target = safeKey(root, input.objectStorageKey)
      await mkdir(path.dirname(target), { recursive: true })
      const existing = await readSidecar(target)
      if (existing) {
        if (existing.contentHash !== input.contentHash || existing.byteLength !== input.byteLength || existing.mediaType !== input.mediaType) throw new Error("ARTIFACT_IMMUTABLE_CONFLICT")
        return Object.freeze({ rawObjectId: `raw_${input.contentHash}`, rawManifestId: `raw_${input.contentHash}`, contentHash: input.contentHash, objectStorageKey: input.objectStorageKey, verificationState: "VERIFIED" })
      }
      const orphan = await inspectExistingFile(target)
      if (orphan) {
        if (orphan.contentHash !== input.contentHash || orphan.byteLength !== input.byteLength) throw new Error("ARTIFACT_IMMUTABLE_CONFLICT")
        await publishSidecar(target, { contentHash: input.contentHash, byteLength: input.byteLength, mediaType: input.mediaType })
        return Object.freeze({ rawObjectId: `raw_${input.contentHash}`, rawManifestId: `raw_${input.contentHash}`, contentHash: input.contentHash, objectStorageKey: input.objectStorageKey, verificationState: "VERIFIED" })
      }
      const temporary = `${target}.${randomUUID()}.partial`
      const handle = await open(temporary, "wx")
      const hash = createHash("sha256")
      let bytes = 0
      try {
        for await (const chunk of input.content) { hash.update(chunk); bytes += chunk.byteLength; await handle.write(chunk) }
        await handle.sync()
      } catch (cause) { await handle.close(); await rm(temporary, { force: true }); throw cause }
      await handle.close()
      const actualHash = hash.digest("hex")
      if (actualHash !== input.contentHash || bytes !== input.byteLength) { await rm(temporary, { force: true }); throw new Error("ARTIFACT_CHECKSUM_MISMATCH") }
      try { await rename(temporary, target) } catch (cause) {
        await rm(temporary, { force: true })
        const concurrent = await readSidecar(target)
        if (!concurrent || concurrent.contentHash !== input.contentHash || concurrent.byteLength !== input.byteLength) throw cause
      }
      const metadata: ArtifactSidecar = { contentHash: input.contentHash, byteLength: bytes, mediaType: input.mediaType }
      await publishSidecar(target, metadata)
      return Object.freeze({ rawObjectId: `raw_${input.contentHash}`, rawManifestId: `raw_${input.contentHash}`, contentHash: input.contentHash, objectStorageKey: input.objectStorageKey, verificationState: "VERIFIED" })
    },
    async stat(objectStorageKey) {
      const target = safeKey(root, objectStorageKey)
      const metadata = await readSidecar(target)
      if (!metadata) return Object.freeze({ exists: false, contentHash: null, byteLength: null })
      try { const value = await stat(target); return Object.freeze({ exists: value.isFile(), contentHash: metadata.contentHash, byteLength: metadata.byteLength }) } catch { return Object.freeze({ exists: false, contentHash: null, byteLength: null }) }
    },
    async *read(objectStorageKey) {
      const target = safeKey(root, objectStorageKey)
      const metadata = await readSidecar(target)
      if (!metadata) throw new Error("ARTIFACT_METADATA_MISSING")
      const handle = await open(target, "r")
      const hash = createHash("sha256"); let byteLength = 0
      try { for await (const chunk of handle.createReadStream({ highWaterMark: 64 * 1024 })) { hash.update(chunk); byteLength += chunk.length; yield chunk } } finally { await handle.close() }
      if (hash.digest("hex") !== metadata.contentHash || byteLength !== metadata.byteLength) throw new Error("ARTIFACT_READ_VERIFICATION_FAILED")
    },
  })
}
