export type NofxObservedArea =
  | "public_positioning"
  | "web_dashboard"
  | "navigation"
  | "onboarding"
  | "strategy"
  | "execution"
  | "monitoring"
  | "configuration"

export interface NofxInventoryItem {
  area: NofxObservedArea
  observedPattern: string
  evidenceSource: string
  productRead: string
  quantTerminalRelevance: "high" | "medium" | "low"
}

export const nofxInventory: NofxInventoryItem[] = [
  {
    area: "public_positioning",
    observedPattern: "AI trading terminal for global markets with research, strategy generation, execution, and monitoring in one workspace.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx",
    productRead: "NOFX positions itself as an end-to-end trading operating surface, not a single dashboard.",
    quantTerminalRelevance: "high",
  },
  {
    area: "web_dashboard",
    observedPattern: "Realtime monitoring includes system status, account equity, positions, decision logs, statistics, and chart tabs.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx/tree/dev/web",
    productRead: "The first useful product surface is operational state plus decision traceability.",
    quantTerminalRelevance: "high",
  },
  {
    area: "navigation",
    observedPattern: "Routes separate landing, onboarding, data, agent chat, settings, strategy market, strategy studio, trader dashboard, traders, and competition.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx/tree/dev/web/src/pages",
    productRead: "Product jobs are separated into named workspaces instead of one mega dashboard.",
    quantTerminalRelevance: "high",
  },
  {
    area: "onboarding",
    observedPattern: "Beginner mode guides model selection, exchange connection, strategy setup, and first deployment; advanced mode exposes direct configuration steps.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx",
    productRead: "Progressive disclosure is explicit: guided beginner path versus direct advanced setup.",
    quantTerminalRelevance: "high",
  },
  {
    area: "strategy",
    observedPattern: "Strategy Studio is framed around market universes, indicators, risk controls, and strategy logic.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx",
    productRead: "Strategy authoring is a dedicated workflow, separate from monitoring.",
    quantTerminalRelevance: "medium",
  },
  {
    area: "execution",
    observedPattern: "Trader dashboard includes positions, close-position actions, selected trader context, exchange display, and model identity.",
    evidenceSource: "https://raw.githubusercontent.com/NoFxAiOS/nofx/dev/web/src/pages/TraderDashboardPage.tsx",
    productRead: "Execution context is account/trader-scoped and action gated by confirmation.",
    quantTerminalRelevance: "medium",
  },
  {
    area: "monitoring",
    observedPattern: "Dashboard uses polling with failure fallbacks and last-update metadata.",
    evidenceSource: "https://raw.githubusercontent.com/NoFxAiOS/nofx/dev/web/src/router/AppRoutes.tsx",
    productRead: "Monitoring UX includes freshness, loading, retry, and failure states.",
    quantTerminalRelevance: "high",
  },
  {
    area: "configuration",
    observedPattern: "Settings/setup/configuration is route-separated from normal trading views.",
    evidenceSource: "https://github.com/NoFxAiOS/nofx/tree/dev/web/src/pages",
    productRead: "Advanced configuration should not compete with active monitoring.",
    quantTerminalRelevance: "high",
  },
]

export const nofxInventorySummary = {
  showsFirst: [
    "Product identity as one AI trading terminal workspace.",
    "Operational dashboard state: system, account, positions, decisions, statistics.",
    "Trader identity, model identity, exchange context, and runtime status.",
  ],
  hidesOrSeparates: [
    "Advanced setup is separate from beginner guided onboarding.",
    "Strategy construction is separate from live dashboard monitoring.",
    "Configuration/settings are route-separated from the main user workflow.",
  ],
  auditCaveat:
    "This audit uses public repository structure, README descriptions, and visible frontend route/component organization. It does not copy NOFX code or implementation details.",
} as const

