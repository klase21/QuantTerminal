export interface NofxNavigationFinding {
  finding: string
  productReason: string
  quantTerminalMapping: string
}

export const nofxNavigationAnalysis: NofxNavigationFinding[] = [
  {
    finding: "NOFX uses distinct routes for onboarding, data, agent chat, settings, strategy market, strategy studio, dashboard, traders, and competition.",
    productReason: "Each route matches a separate trading job rather than a visual category.",
    quantTerminalMapping: "QuantTerminal should separate Realtime Dashboard, Replay Forensics, Historical Intelligence Ops, Prediction Markets, and Setup Memory.",
  },
  {
    finding: "Beginner onboarding and advanced configuration are separate concepts.",
    productReason: "New users need guided setup; advanced users need direct controls.",
    quantTerminalMapping: "Replay should stay narrative-first; Data Operations should move into an advanced workbench or route.",
  },
  {
    finding: "Dashboard route is selected-trader scoped.",
    productReason: "Every metric and action inherits user context.",
    quantTerminalMapping: "Replay should be selected-case scoped; all panels must clearly follow the chosen case.",
  },
  {
    finding: "Agent chat is separate from dashboard monitoring.",
    productReason: "Conversational control is useful but should not obscure core monitoring.",
    quantTerminalMapping: "Future Intelligence Assistant should be a sidecar, not the primary replay layout.",
  },
  {
    finding: "Strategy Studio is route-level, not a modal inside dashboard.",
    productReason: "Strategy building needs space and different mental mode.",
    quantTerminalMapping: "Future Tactical Playbook Builder should be route-level, not embedded in Replay Narrative Flow.",
  },
]

export const quantTerminalFutureNavigation = [
  "Realtime Tactical Dashboard",
  "Replay / Market Forensics",
  "Historical Intelligence Ops",
  "Prediction Market Expectations",
  "Setup Outcome Memory",
  "Tactical Playbook Lab",
  "Settings / Data Sources",
] as const

