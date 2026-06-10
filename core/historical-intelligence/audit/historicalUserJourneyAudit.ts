export interface HistoricalUserJourneyAudit {
  persona: "first_time_visitor" | "active_trader" | "research_analyst"
  likelyClicks: string[]
  whatTheyUnderstand: string[]
  whatConfusesThem: string[]
  abandonmentRisks: string[]
  recommendedGuidance: string[]
}

export const historicalUserJourneyAudit: HistoricalUserJourneyAudit[] = [
  {
    persona: "first_time_visitor",
    likelyClicks: ["Case selector", "Core Replay Forensics", "Memory & Expectations"],
    whatTheyUnderstand: [
      "A selected market event is being investigated.",
      "Narrative and reality are being compared.",
      "Drivers are ranked with confidence.",
    ],
    whatConfusesThem: [
      "Difference between Learning Summary and Replay Explanation.",
      "Why internal storage/ingestion panels exist in a replay workspace.",
      "Meaning of Event Memory Linker versus Market Memory.",
    ],
    abandonmentRisks: [
      "Too many collapsed sections with technical labels.",
      "Internal tools appear before the user understands the replay workflow.",
      "No single beginner path from case to lesson to action.",
    ],
    recommendedGuidance: [
      "Pin a Case Brief that answers what happened, why, and lesson.",
      "Move storage and ingestion behind an advanced mode.",
      "Rename abstract sections into trader-language questions.",
    ],
  },
  {
    persona: "active_trader",
    likelyClicks: ["Possible Drivers", "Tactical Playbook", "Setup Outcome Memory", "Expectation Intelligence"],
    whatTheyUnderstand: [
      "Which drivers likely mattered.",
      "Whether similar setups historically worked.",
      "Which execution checklist should be remembered.",
    ],
    whatConfusesThem: [
      "Actionable cards are hidden below lower-frequency research panels.",
      "Decision recommendation is split between Journal, Playbook, and Learning Summary.",
      "Expectation and Prediction Market layers feel duplicated.",
    ],
    abandonmentRisks: [
      "The trader cannot quickly answer wait, avoid, confirm, or execute.",
      "Too much operator tooling creates perceived noise.",
      "Repeated caveats dilute confidence hierarchy.",
    ],
    recommendedGuidance: [
      "Expose Suggested Focus and Playbook near the top.",
      "Use one action-state language across Decision Journal and Playbook.",
      "Keep Possible Drivers always visible.",
    ],
  },
  {
    persona: "research_analyst",
    likelyClicks: ["Similar Historical Events", "Market Memory", "Historical Query Explorer", "Relationship Graph", "Record Inspector"],
    whatTheyUnderstand: [
      "The workspace has a broad historical memory substrate.",
      "Cases can be linked to events, decisions, outcomes, and playbooks.",
      "External source intake is review-first and mock-safe.",
    ],
    whatConfusesThem: [
      "Which record source is canonical when Query, Inspector, Graph, and Memory disagree in emphasis.",
      "Whether scoring is an input to graph relevance or a separate conclusion.",
      "How accepted event links feed back into case memory.",
    ],
    abandonmentRisks: [
      "Analyst workflows are spread across multiple collapsed panels.",
      "Relationship authoring and relationship viewing are separated.",
      "Search and inspect workflows duplicate each other.",
    ],
    recommendedGuidance: [
      "Create a dedicated Historical Workbench path for data ops and research.",
      "Merge link candidates, graph, scoring, and inspector into one record context surface.",
      "Keep replay review separate from source ingestion work.",
    ],
  },
]

