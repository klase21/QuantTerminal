export interface HistoricalInformationFlowQuestionAudit {
  question: string
  primaryPanels: string[]
  partialPanels: string[]
  duplicateAnswers: string[]
  missingAnswers: string[]
}

export const historicalInformationFlowAudit: HistoricalInformationFlowQuestionAudit[] = [
  {
    question: "What Happened?",
    primaryPanels: ["Selected Case Summary", "Replay Timeline", "Replay Explanation"],
    partialPanels: ["Replay Learning Summary", "Narrative vs Reality", "Decision Journal"],
    duplicateAnswers: ["Selected Case Summary and Replay Learning Summary both restate verdict/context."],
    missingAnswers: ["A single compact incident headline that combines time, asset, move, and trigger is not yet distinct."],
  },
  {
    question: "Why Happened?",
    primaryPanels: ["Possible Drivers", "Replay Explanation", "Narrative vs Reality"],
    partialPanels: ["Event Memory Linker", "Market Memory", "Agent Committee", "Expectation Intelligence"],
    duplicateAnswers: [
      "Replay Explanation, Learning Summary, Event Memory Linker, and Market Memory all provide causality language.",
      "Possible Drivers and Narrative vs Reality both rank or evaluate driver validity.",
    ],
    missingAnswers: ["Driver confidence is not consistently tied to evidence snippets in one place."],
  },
  {
    question: "What Similar Events?",
    primaryPanels: ["Similar Historical Events", "Market Memory"],
    partialPanels: ["Relationship Graph", "Historical Query Explorer", "Event Memory Linker"],
    duplicateAnswers: [
      "Similar Historical Events and Market Memory both surface analogs.",
      "Query Explorer can rediscover similar records manually.",
    ],
    missingAnswers: ["A concise analog table with outcome, driver match, and difference is not yet the default surface."],
  },
  {
    question: "What Worked?",
    primaryPanels: ["Setup Outcome Memory", "Replay Learning Summary", "Tactical Playbook"],
    partialPanels: ["Decision Journal", "Agent Accuracy", "Historical Scoring"],
    duplicateAnswers: ["Learning Summary and Setup Outcome Memory both state historical lessons."],
    missingAnswers: ["The UI does not yet show a single strongest prior condition next to the current case conditions."],
  },
  {
    question: "What Failed?",
    primaryPanels: ["Replay Explanation", "Decision Journal", "Narrative vs Reality"],
    partialPanels: ["Setup Outcome Memory", "Agent Accuracy", "Learning Summary"],
    duplicateAnswers: ["Replay Explanation, Decision Journal, and Learning Summary all state failure/mistake language."],
    missingAnswers: ["Failure mode taxonomy is implied, not yet standardized across panels."],
  },
  {
    question: "What Should I Watch?",
    primaryPanels: ["Tactical Playbook", "Expectation Intelligence", "Possible Drivers"],
    partialPanels: ["Prediction Markets", "Market Memory", "Agent Committee"],
    duplicateAnswers: ["Expectation Intelligence and Prediction Markets both discuss expectation/priced-in context."],
    missingAnswers: ["There is no compact watchlist card that extracts the top three live variables from replay lessons."],
  },
  {
    question: "What Should I Do?",
    primaryPanels: ["Tactical Playbook", "Decision Journal", "Replay Learning Summary"],
    partialPanels: ["Setup Outcome Memory", "Agent Accuracy", "Historical Scoring"],
    duplicateAnswers: ["Tactical Playbook and Decision Journal both create future rules."],
    missingAnswers: ["A trader-facing action state such as wait/avoid/confirm/execute is not consistently pinned."],
  },
]

