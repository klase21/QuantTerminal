import type { MvpServingMode } from "./contracts"

const MODES = new Set<MvpServingMode>(["serving_postgres", "certified_snapshot", "local_truth"])

export function resolveMvpServingMode(environment: Readonly<Record<string, string | undefined>> = process.env): MvpServingMode {
  const configured = environment.MVP_SERVING_MODE
  if (configured && MODES.has(configured as MvpServingMode)) return configured as MvpServingMode
  if (configured) throw new Error("MVP_SERVING_MODE_INVALID")
  if (environment.NODE_ENV === "production") throw new Error("MVP_SERVING_MODE_REQUIRED")
  return "local_truth"
}

export function permitsCertifiedSnapshotFallback(environment: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return environment.MVP_SERVING_FALLBACK_POLICY === "certified_snapshot_on_unavailable"
}
