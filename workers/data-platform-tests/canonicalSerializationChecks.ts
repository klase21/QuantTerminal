import { canonicalChecksum, canonicalSerialize, normalizeIsoTimestamp } from "@/lib/data-platform/contracts"
export const serializationA = canonicalSerialize({ b: 2, a: [null, 1] })
export const serializationB = canonicalSerialize({ a: [null, 1], b: 2 })
export const checksumA = canonicalChecksum({ b: 2, a: 1 })
export const checksumB = canonicalChecksum({ a: 1, b: 2 })
export const epoch = normalizeIsoTimestamp(0)
