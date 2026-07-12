import { createHash } from "node:crypto"

export type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue }

export interface CanonicalSerializationOptions {
  normalizeKey?: (key: string, value: CanonicalValue) => CanonicalValue
}

function normalize(value: unknown, options: CanonicalSerializationOptions, key = ""): CanonicalValue {
  if (value === undefined) throw new TypeError("Undefined is not a canonical value")
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    const normalized = value as null | boolean | string
    return options.normalizeKey?.(key, normalized) ?? normalized
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Non-finite numbers are not canonical values")
    const normalized = Object.is(value, -0) ? 0 : value
    return options.normalizeKey?.(key, normalized) ?? normalized
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => normalize(item, options))
  if (typeof value === "object") {
    const output: Record<string, CanonicalValue> = {}
    for (const childKey of Object.keys(value as object).sort()) {
      output[childKey] = normalize((value as Record<string, unknown>)[childKey], options, childKey)
    }
    return output
  }
  throw new TypeError(`Unsupported canonical value: ${typeof value}`)
}

export function canonicalize(value: unknown, options: CanonicalSerializationOptions = {}): CanonicalValue {
  return normalize(value, options)
}

export function canonicalSerialize(value: unknown, options: CanonicalSerializationOptions = {}): string {
  return JSON.stringify(canonicalize(value, options))
}

export function canonicalChecksum(value: unknown, options: CanonicalSerializationOptions = {}): string {
  return createHash("sha256").update(canonicalSerialize(value, options)).digest("hex")
}

export function normalizeIsoTimestamp(value: string | number | Date): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) throw new TypeError("Invalid timestamp")
  return date.toISOString()
}

export function normalizeIdentifier(value: string): string { return value.trim().toUpperCase() }
