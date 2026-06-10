export interface NofxInformationArchitectureLayer {
  layer: string
  whatItOrganizes: string
  nofxPattern: string
  quantTerminalAdaptation: string
}

export const nofxInformationArchitecture: NofxInformationArchitectureLayer[] = [
  {
    layer: "Entry",
    whatItOrganizes: "User orientation and product promise.",
    nofxPattern: "Landing and onboarding introduce the terminal as a complete AI trading workflow.",
    quantTerminalAdaptation: "Replay should open with a Case Brief and the Tactical Decision OS promise: what happened, why, and what to watch.",
  },
  {
    layer: "Workspace Navigation",
    whatItOrganizes: "Major jobs to be done.",
    nofxPattern: "Separate route concepts: dashboard, strategy studio, data, agent chat, settings, onboarding.",
    quantTerminalAdaptation: "Separate Realtime, Replay, Historical Intelligence, Event Intake, and Settings as task workspaces.",
  },
  {
    layer: "Monitoring",
    whatItOrganizes: "Current system/account/trader state.",
    nofxPattern: "Dashboard prioritizes status, account, positions, charts, and decision logs.",
    quantTerminalAdaptation: "Realtime dashboard should prioritize market state, opportunity routing, flow, risk, and freshness.",
  },
  {
    layer: "Decision Trace",
    whatItOrganizes: "AI reasoning and action auditability.",
    nofxPattern: "Decision records include expandable AI reasoning steps.",
    quantTerminalAdaptation: "Replay should expose Narrative vs Reality, Agent Read, Decision Journal, and evidence trace as one report flow.",
  },
  {
    layer: "Strategy Authoring",
    whatItOrganizes: "Market universes, indicators, risk controls, and strategy logic.",
    nofxPattern: "Strategy Studio is a dedicated authoring surface.",
    quantTerminalAdaptation: "QuantTerminal should keep future Setup Playbooks and Strategy Lab separate from Replay review.",
  },
  {
    layer: "Advanced Configuration",
    whatItOrganizes: "Exchanges, models, runtime configuration, setup.",
    nofxPattern: "Beginner and advanced setup flows are distinct.",
    quantTerminalAdaptation: "Data Operations Workbench should remain advanced/collapsed and later become its own Historical Intelligence Ops area.",
  },
]

export const nofxIaQuestions = {
  whatDoesNofxShowFirst: "Operational trading context: status, account, positions, decisions, selected trader/model/exchange.",
  whatDoesNofxHide: "Configuration, setup, strategy authoring, and advanced mode details are separated from the default dashboard.",
  howTradingWorkflowsAreOrganized: "Research and strategy are distinct from execution and monitoring, with AI decision logs bridging them.",
  quantTerminalFit: "QuantTerminal should use the same separation principle but apply it to event forensics and historical memory instead of automated execution.",
} as const

