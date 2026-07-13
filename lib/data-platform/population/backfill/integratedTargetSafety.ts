import { inspectDurableCanonicalTarget } from "@/lib/data-platform/persistence/postgres"
import { inspectDurableD3Target } from "@/lib/data-platform/population/postgres"

import { inspectFilesystemObjectRoot } from "./filesystemObjectStorage"

export const INTEGRATED_BACKFILL_DATABASE = "quantterminal_backfill" as const
export const INTEGRATED_BACKFILL_PROFILE = "INTEGRATED_BACKFILL" as const

export interface IntegratedBackfillTargetInput {
  readonly d2Url: string | undefined
  readonly d3Url: string | undefined
  readonly objectRoot: string | undefined
  readonly repositoryRoot: string
}

export interface IntegratedBackfillTargetInspection {
  readonly safe: boolean
  readonly profile: typeof INTEGRATED_BACKFILL_PROFILE
  readonly host: string | null
  readonly port: string | null
  readonly database: string | null
  readonly d2Role: string | null
  readonly d3Role: string | null
  readonly d2RedactedTarget: string
  readonly d3RedactedTarget: string
  readonly objectRoot: string | null
  readonly availableBytes: number | null
  readonly reasons: readonly string[]
}

interface ParsedTarget { readonly host: string; readonly port: string; readonly database: string; readonly role: string }

function parseTarget(value: string | undefined): ParsedTarget | null {
  if (!value?.trim()) return null
  try {
    const url = new URL(value)
    return Object.freeze({
      host: url.hostname.toLowerCase(),
      port: url.port || "5432",
      database: decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase(),
      role: decodeURIComponent(url.username || ""),
    })
  } catch {
    return null
  }
}

export async function inspectIntegratedBackfillTarget(input: IntegratedBackfillTargetInput): Promise<IntegratedBackfillTargetInspection> {
  const reasons: string[] = []
  const d2Inspection = inspectDurableCanonicalTarget(input.d2Url, INTEGRATED_BACKFILL_PROFILE)
  const d3Inspection = inspectDurableD3Target(input.d3Url, INTEGRATED_BACKFILL_PROFILE)
  const d2 = parseTarget(input.d2Url)
  const d3 = parseTarget(input.d3Url)

  reasons.push(...d2Inspection.reasons.map((reason) => `D2_${reason}`))
  reasons.push(...d3Inspection.reasons.map((reason) => `D3_${reason}`))
  if (d2 && d3) {
    if (d2.host !== d3.host) reasons.push("INTEGRATED_HOST_MISMATCH")
    if (d2.port !== d3.port) reasons.push("INTEGRATED_PORT_MISMATCH")
    if (d2.database !== d3.database) reasons.push("INTEGRATED_DATABASE_MISMATCH")
    if (d2.role === d3.role) reasons.push("INTEGRATED_ROLES_MUST_DIFFER")
  }

  let objectRoot: string | null = null
  let availableBytes: number | null = null
  if (!input.objectRoot?.trim()) {
    reasons.push("D3_BACKFILL_OBJECT_ROOT_MISSING")
  } else {
    const storage = await inspectFilesystemObjectRoot({ root: input.objectRoot, repositoryRoot: input.repositoryRoot, createRoot: false })
    objectRoot = storage.resolvedRoot
    availableBytes = storage.availableBytes
    reasons.push(...storage.reasons)
  }

  return Object.freeze({
    safe: reasons.length === 0,
    profile: INTEGRATED_BACKFILL_PROFILE,
    host: d2?.host ?? d3?.host ?? null,
    port: d2?.port ?? d3?.port ?? null,
    database: d2?.database ?? d3?.database ?? null,
    d2Role: d2?.role || null,
    d3Role: d3?.role || null,
    d2RedactedTarget: d2Inspection.redactedTarget,
    d3RedactedTarget: d3Inspection.redactedTarget,
    objectRoot,
    availableBytes,
    reasons: Object.freeze(reasons),
  })
}

export async function requireIntegratedBackfillTarget(input: IntegratedBackfillTargetInput): Promise<IntegratedBackfillTargetInspection> {
  const inspection = await inspectIntegratedBackfillTarget(input)
  if (!inspection.safe) throw new Error(`Unsafe integrated backfill target: ${inspection.reasons.join(",")}`)
  return inspection
}
