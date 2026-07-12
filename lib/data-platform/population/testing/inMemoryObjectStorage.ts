import { createHash } from "node:crypto"
import type { ObjectStoragePort, RawArtifactReference } from "../contracts"

async function collect(content: AsyncIterable<Uint8Array>): Promise<Uint8Array> { const chunks: Uint8Array[] = []; let length = 0; for await (const chunk of content) { chunks.push(chunk); length += chunk.byteLength }; const output = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength }; return output }
export class InMemoryObjectStorage implements ObjectStoragePort {
  private readonly objects = new Map<string, { readonly bytes: Uint8Array; readonly hash: string; readonly mediaType: string }>()
  async putImmutable(input: Parameters<ObjectStoragePort["putImmutable"]>[0]): Promise<RawArtifactReference> {
    const bytes = await collect(input.content); const hash = createHash("sha256").update(bytes).digest("hex")
    if (hash !== input.contentHash || bytes.byteLength !== input.byteLength) throw new Error("OBJECT_VERIFICATION_FAILED")
    const existing = this.objects.get(input.objectStorageKey)
    if (existing && existing.hash !== hash) throw new Error("IMMUTABLE_OBJECT_CONFLICT")
    this.objects.set(input.objectStorageKey, existing ?? { bytes, hash, mediaType: input.mediaType })
    return { rawObjectId: `raw:${hash}`, rawManifestId: `raw:${hash}`, contentHash: hash, objectStorageKey: input.objectStorageKey, verificationState: "VERIFIED" }
  }
  async stat(key: string) { const value = this.objects.get(key); return { exists: Boolean(value), contentHash: value?.hash ?? null, byteLength: value?.bytes.byteLength ?? null } }
  async *read(key: string): AsyncIterable<Uint8Array> { const value = this.objects.get(key); if (!value) throw new Error("OBJECT_MISSING"); yield value.bytes }
}
