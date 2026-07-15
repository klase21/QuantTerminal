import { createHash } from "node:crypto"

export type ExternalContextProjectionKind = "MacroContextProjection" | "BitcoinEtfFlowProjection"
export type ExternalContextAvailability = "AVAILABLE" | "ACCESS_CONFIGURATION_REQUIRED" | "SOURCE_ACCESS_BLOCKED" | "WITHHELD"

export interface ExternalContextProjection<TPayload extends object = Record<string, never>> {
  readonly projectionId: string
  readonly projectionKind: ExternalContextProjectionKind
  readonly schemaVersion: "1.0.0"
  readonly availability: ExternalContextAvailability
  readonly observationStart: string | null
  readonly observationEnd: string | null
  readonly knowledgeTime: string
  readonly providerIds: readonly string[]
  readonly payload: Readonly<TPayload>
  readonly limitations: readonly string[]
  readonly dependencyDigest: string
  readonly contentChecksum: string
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`
  return JSON.stringify(value)
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex")
}

export function createExternalContextProjection<TPayload extends object>(input: Omit<ExternalContextProjection<TPayload>, "projectionId" | "schemaVersion" | "contentChecksum">): ExternalContextProjection<TPayload> {
  const providerIds = [...input.providerIds].sort()
  const identity = { projectionKind: input.projectionKind, observationStart: input.observationStart, observationEnd: input.observationEnd, knowledgeTime: input.knowledgeTime, providerIds, dependencyDigest: input.dependencyDigest }
  const projectionId = `${input.projectionKind.toLowerCase()}:1:${digest(identity)}`
  const content = { ...input, providerIds, projectionId, schemaVersion: "1.0.0" as const }
  return Object.freeze({ ...content, contentChecksum: digest(content) })
}
