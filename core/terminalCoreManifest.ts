export interface TerminalCoreModule {
  key: string
  label: string
  status: "extracted" | "scaffold" | "pending"
  path: string
  description: string
}

export const terminalCoreManifest: TerminalCoreModule[] = [
  {
    key: "shared-metrics",
    label: "Shared Metrics",
    status: "extracted",
    path: "core/shared/metrics.ts",
    description: "Reusable clamp, percentile, direction, and formatting helpers.",
  },
  {
    key: "sector-registry",
    label: "Sector Registry",
    status: "extracted",
    path: "core/registry/sectorRegistry.ts",
    description: "Canonical sector definitions, aliases, symbol mapping, and weights.",
  },
  {
    key: "event-bus",
    label: "Event Bus",
    status: "scaffold",
    path: "core/event-bus/*",
    description: "Typed terminal event stream for alerts, timeline, replay, and operator console.",
  },
  {
    key: "alert-engine",
    label: "Alert Engine",
    status: "scaffold",
    path: "core/alerts/*",
    description: "Promotion payloads, severity, cooldown keys, and deduplication boundary.",
  },
  {
    key: "replay-engine",
    label: "Replay Engine",
    status: "scaffold",
    path: "core/replay/*",
    description: "Historical snapshot and replay frame contracts for replay extraction.",
  },
  {
    key: "regime-core",
    label: "Regime Core",
    status: "scaffold",
    path: "core/regime/*",
    description: "Regime IDs and transition rules for the state machine.",
  },
  {
    key: "rotation-core",
    label: "Rotation Core",
    status: "scaffold",
    path: "core/rotation/*",
    description: "Sector state machine contracts and score decomposition.",
  },
  {
    key: "worker-contracts",
    label: "Worker Contracts",
    status: "pending",
    path: "core/workers/*",
    description: "Message contracts for moving replay/backtest/scoring off the UI thread.",
  },
]

export function getCoreMigrationStats() {
  const total = terminalCoreManifest.length
  const extracted = terminalCoreManifest.filter((item) => item.status === "extracted").length
  const scaffold = terminalCoreManifest.filter((item) => item.status === "scaffold").length
  const pending = terminalCoreManifest.filter((item) => item.status === "pending").length
  return { total, extracted, scaffold, pending }
}
