export interface HistoricalIntelligenceAuditReport {
  executiveSummary: string
  top10UxProblems: string[]
  top10Strengths: string[]
  top10HiddenGems: string[]
  top10MergeOpportunities: string[]
  top10Simplifications: string[]
  recommendedReplayLayoutV2: string[]
  recommendedReplayLayoutV3: string[]
  recommendedFutureNofxLayout: string[]
}

export const historicalIntelligenceAuditReport: HistoricalIntelligenceAuditReport = {
  executiveSummary:
    "Replay / Historical Intelligence now has a strong mock-first intelligence foundation, but the workspace mixes trader-facing forensics with internal data operations. The next redesign should preserve the strongest tactical reads while merging duplicated interpretation panels and moving ingestion, validation, linking, scoring, and inspection tools into an advanced workbench.",
  top10UxProblems: [
    "Learning Summary and Replay Explanation repeat verdict, factor, caveat, and future-rule language.",
    "Market Memory, Event Memory Linker, Similar Events, and Relationship Graph overlap in historical context.",
    "Expectation Intelligence and Prediction Markets split the priced-in question across two panels.",
    "Storage and ingestion tools appear inside the Replay workspace even though they serve operator workflows.",
    "Tactical Playbook is highly actionable but currently hidden in a secondary collapsed section.",
    "Agent Committee and Agent Accuracy require users to manually connect stance with calibration.",
    "Historical Query Explorer and Record Inspector duplicate record discovery for most users.",
    "Relationship Graph and Historical Scoring are valuable metadata layers but are too abstract as standalone panels.",
    "Repeated mock-only and caution language can reduce signal-to-noise.",
    "Question hierarchy is implicit; users must infer the path from event to evidence to lesson.",
  ],
  top10Strengths: [
    "Replay Case Selector makes case-aware intelligence possible.",
    "Possible Drivers is a strong immediate anchor for causal reasoning.",
    "Narrative vs Reality directly supports QuantTerminal's market forensics direction.",
    "Replay Learning Summary provides fast synthesis.",
    "Decision Journal connects analysis to decision discipline.",
    "Setup Outcome Memory makes historical review execution-aware.",
    "Tactical Playbook converts replay into next-time behavior.",
    "Prediction and expectation layers establish the future expectation-market direction.",
    "Review-first ingestion workflow is safer than direct persistence writes.",
    "Collapsed sections already provide a foundation for density control.",
  ],
  top10HiddenGems: [
    "Tactical Playbook should be promoted because it answers what to do next time.",
    "Setup Outcome Memory is a key bridge from history to execution.",
    "Agent Accuracy can become a trust layer for the agent committee.",
    "Relationship Graph can become the long-term memory map once links exist.",
    "Historical Scoring is best used as inline record priority metadata.",
    "Decision Journal can become the seed of setup outcome memory.",
    "Polymarket validation creates a safe real-source readiness path.",
    "Accepted Event Linker enables explainable memory relationships.",
    "Historical Query Explorer is useful for analyst mode.",
    "External Review Queue is an important governance pattern for future live data.",
  ],
  top10MergeOpportunities: [
    "Selected Case Summary + Replay Learning Summary + Replay Explanation -> Case Brief.",
    "Similar Historical Events + Setup Outcome Memory + Market Memory -> Historical Context.",
    "Expectation Intelligence + Prediction Markets -> Expectation Context.",
    "Agent Committee + Agent Accuracy -> Agent Read.",
    "Decision Journal + Tactical Playbook -> Decision & Playbook, if space is constrained.",
    "Historical Query Explorer + Record Inspector -> Historical Search.",
    "Accepted Event Linker + Relationship Graph -> Relationship Workbench.",
    "External Adapter Preview + Polymarket Live Validation -> Source Preview & Validation.",
    "External Review Queue + accepted link generation -> Source Review Flow.",
    "Historical Scoring + graph/list records -> inline score badges.",
  ],
  top10Simplifications: [
    "Rename sections around user questions rather than internal system names.",
    "Keep Possible Drivers visible as the causal anchor.",
    "Move Storage & Ingestion into advanced mode.",
    "Use one confidence language across cards.",
    "Use one caveat footer per group instead of repeating caveats per panel.",
    "Expose one action-state summary: wait, avoid, confirm, or execute.",
    "Show analog outcome stats beside similar events.",
    "Show prediction market details inside expectation context.",
    "Use score badges instead of a scoring panel.",
    "Turn relationship graph into a contextual trace available after accepted links exist.",
  ],
  recommendedReplayLayoutV2: [
    "Top: Case Selector and compact Case Brief.",
    "Left: Narrative vs Reality and Replay Timeline.",
    "Right pinned: Possible Drivers and Tactical Playbook.",
    "Collapsed: Historical Context, Expectation Context, Agent Read.",
    "Advanced collapsed: Storage, ingestion, source preview, validation, linking, graph, inspector.",
  ],
  recommendedReplayLayoutV3: [
    "Tabs: Brief, Evidence, History, Decision, Data Ops.",
    "Brief tab: Case Brief, Drivers, Learning Summary, Decision State.",
    "Evidence tab: Timeline, Narrative vs Reality, expectation evidence.",
    "History tab: Similar events, outcome memory, market memory, relationship trace.",
    "Decision tab: Playbook, journal, agent read, invalidation.",
    "Data Ops tab: adapters, validation, queue, linker, inspector, query.",
  ],
  recommendedFutureNofxLayout: [
    "Use a command-center layout with a pinned incident strip.",
    "Make the primary read feel like a forensic dossier: incident, driver stack, evidence, analogs, decision rule.",
    "Keep technical data operations behind a workbench toggle.",
    "Use sparse but high-contrast cards with very dense content, not decorative panels.",
    "Represent the event memory chain as a trace: Event -> Case -> Memory -> Decision -> Outcome -> Playbook.",
    "Prioritize trader language over engine names.",
    "Treat prediction markets as expectation context, not a separate product surface.",
    "Treat agent output as accountable committee read with calibration.",
    "Use historical scoring as small priority markers throughout the UI.",
    "Design for immediate tactical answer first, expandable research second.",
  ],
}

