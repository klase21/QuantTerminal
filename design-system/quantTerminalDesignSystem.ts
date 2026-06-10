export type QuantCardType =
  | "primary"
  | "secondary"
  | "evidence"
  | "signal"
  | "warning"
  | "decision"

export type QuantInformationLevel = "level_1" | "level_2" | "level_3" | "level_4" | "advanced"
export type QuantDensityMode = "beginner" | "trader" | "research"
export type QuantConfidenceBand = "very_low" | "low" | "medium" | "high"
export type QuantSeverity = "low" | "medium" | "high" | "critical"
export type QuantColorSemantic =
  | "surface"
  | "surface_subtle"
  | "border"
  | "text_primary"
  | "text_secondary"
  | "accent"
  | "positive"
  | "negative"
  | "warning"
  | "muted"

export interface QuantCardDefinition {
  type: QuantCardType
  purpose: string
  intendedUse: string[]
  avoidUse: string[]
  visualRule: string
  contentRule: string
}

export interface QuantInformationLevelRule {
  level: QuantInformationLevel
  name: string
  question: string
  visibleByDefault: boolean
  maxCards: number
  rule: string
}

export interface QuantColorSemanticRule {
  semantic: QuantColorSemantic
  role: string
  recommendedClasses: string
  usageRule: string
}

export interface QuantConfidenceRule {
  min: number
  max: number
  band: QuantConfidenceBand
  label: string
  displayRule: string
  toneRule: string
}

export interface QuantSeverityRule {
  severity: QuantSeverity
  label: string
  displayRule: string
  toneRule: string
}

export interface QuantLayoutRule {
  name: string
  rule: string
  replayImplication: string
}

export interface QuantSpacingRule {
  token: string
  value: string
  usage: string
}

export interface QuantTypographyRule {
  role: string
  recommendedClasses: string
  usage: string
}

export interface QuantDensityRule {
  mode: QuantDensityMode
  intendedUser: string
  defaultDisclosure: string
  copyRule: string
  cardRule: string
}

export const quantCardTypes: QuantCardDefinition[] = [
  {
    type: "primary",
    purpose: "Orient the user around the main market question.",
    intendedUse: ["Case Brief", "top replay summary", "current tactical verdict"],
    avoidUse: ["internal tools", "long lists", "raw record inspection"],
    visualRule: "Use the strongest border/accent treatment, but keep the surface dark and compact.",
    contentRule: "Lead with verdict, confidence, and one-sentence context.",
  },
  {
    type: "secondary",
    purpose: "Support the primary read without competing for attention.",
    intendedUse: ["Historical Context", "Expectation Context", "Agent Read"],
    avoidUse: ["critical warnings", "primary decision state"],
    visualRule: "Use standard zinc surface, subtle border, and one accent only.",
    contentRule: "Summarize first, then show up to three supporting details.",
  },
  {
    type: "evidence",
    purpose: "Show proof, contradiction, timeline items, or analog reasons.",
    intendedUse: ["news evidence", "driver evidence", "analog match reasons", "timeline events"],
    avoidUse: ["final decisions", "navigation containers"],
    visualRule: "Use subdued surface and small badges. Avoid oversized cards.",
    contentRule: "Evidence should be source-aware and short enough to scan.",
  },
  {
    type: "signal",
    purpose: "Highlight current watch items, expectation shifts, or actionable changes.",
    intendedUse: ["watchlist items", "expectation changes", "agent confidence", "flow signals"],
    avoidUse: ["historical record forms", "large explanatory text"],
    visualRule: "Use cyan for actionable but non-alarm signals.",
    contentRule: "Phrase as observable conditions, not instructions to trade.",
  },
  {
    type: "warning",
    purpose: "Flag risk, contradiction, invalidation, or low confidence.",
    intendedUse: ["risk signals", "failure modes", "invalidation checklist", "missing data caveats"],
    avoidUse: ["normal neutral metadata"],
    visualRule: "Use amber for caution and rose only for high-risk or negative evidence.",
    contentRule: "State what invalidates the thesis or reduces confidence.",
  },
  {
    type: "decision",
    purpose: "Translate analysis into decision hygiene and future playbook behavior.",
    intendedUse: ["Decision Journal", "Tactical Playbook", "future execution rule"],
    avoidUse: ["source adapter previews", "raw market tables"],
    visualRule: "Use compact checklist structure with clear action-state language.",
    contentRule: "Use wait, avoid, confirm, execute, or review language without implying live signals.",
  },
]

export const quantInformationLevels: QuantInformationLevelRule[] = [
  {
    level: "level_1",
    name: "Immediate Case Read",
    question: "What happened?",
    visibleByDefault: true,
    maxCards: 1,
    rule: "Show the case brief, verdict, confidence, and event window immediately.",
  },
  {
    level: "level_2",
    name: "Causal Read",
    question: "Why did it happen?",
    visibleByDefault: false,
    maxCards: 2,
    rule: "Combine drivers, narrative shift, evidence, and reality check into one investigation step.",
  },
  {
    level: "level_3",
    name: "Historical Context",
    question: "Has this happened before?",
    visibleByDefault: false,
    maxCards: 1,
    rule: "Show analogs and memory context together; hide engine names.",
  },
  {
    level: "level_4",
    name: "Outcome Memory",
    question: "What worked before?",
    visibleByDefault: false,
    maxCards: 1,
    rule: "Pair historical winners/failures with playbook and invalidation rules.",
  },
  {
    level: "advanced",
    name: "Data Operations",
    question: "How was this data reviewed or stored?",
    visibleByDefault: false,
    maxCards: 1,
    rule: "Keep source preview, validation, review queue, linking, scoring, and inspection out of the normal replay path.",
  },
]

export const quantColorSemantics: QuantColorSemanticRule[] = [
  { semantic: "surface", role: "Primary dark card surface", recommendedClasses: "bg-zinc-950/80 border-zinc-800", usageRule: "Default dashboard surface." },
  { semantic: "surface_subtle", role: "Nested detail surface", recommendedClasses: "bg-black/45 border-zinc-900", usageRule: "Use for evidence rows and compact subcards." },
  { semantic: "border", role: "Default structural border", recommendedClasses: "border-zinc-800", usageRule: "Keep borders quiet unless the card is a signal or warning." },
  { semantic: "text_primary", role: "Primary label/value", recommendedClasses: "text-white", usageRule: "Use for verdicts, titles, and important values." },
  { semantic: "text_secondary", role: "Secondary explanatory copy", recommendedClasses: "text-zinc-400", usageRule: "Use for supporting explanations." },
  { semantic: "accent", role: "Tactical intelligence accent", recommendedClasses: "text-cyan-300 bg-cyan-400/10 border-cyan-300/20", usageRule: "Use for signals, section anchors, and active states." },
  { semantic: "positive", role: "Constructive or confirming evidence", recommendedClasses: "text-emerald-100 bg-emerald-400/10 border-emerald-300/15", usageRule: "Use sparingly for supporting evidence and favorable outcomes." },
  { semantic: "negative", role: "Contradiction or adverse outcome", recommendedClasses: "text-rose-100 bg-rose-400/10 border-rose-300/15", usageRule: "Use for failures, contradictions, or high adverse risk." },
  { semantic: "warning", role: "Caution and invalidation", recommendedClasses: "text-amber-100 bg-amber-400/10 border-amber-300/15", usageRule: "Use for risk states and uncertain conclusions." },
  { semantic: "muted", role: "Low emphasis metadata", recommendedClasses: "text-zinc-500", usageRule: "Use for timestamps, labels, and caveats." },
]

export const quantConfidenceRules: QuantConfidenceRule[] = [
  {
    min: 0,
    max: 30,
    band: "very_low",
    label: "Low confidence",
    displayRule: "Show as muted or warning; avoid prominent verdict styling.",
    toneRule: "Use cautious wording and surface missing evidence.",
  },
  {
    min: 31,
    max: 60,
    band: "low",
    label: "Mixed confidence",
    displayRule: "Show as amber or neutral badge; pair with caveat.",
    toneRule: "Use probable/possible language.",
  },
  {
    min: 61,
    max: 80,
    band: "medium",
    label: "Moderate confidence",
    displayRule: "Show as cyan badge; one confidence display per section.",
    toneRule: "Use directional language while preserving uncertainty.",
  },
  {
    min: 81,
    max: 100,
    band: "high",
    label: "High confidence",
    displayRule: "Show as strong cyan or emerald only when evidence confirms the read.",
    toneRule: "Use clear but non-trading-signal language.",
  },
]

export const quantSeverityRules: QuantSeverityRule[] = [
  { severity: "low", label: "Low", displayRule: "Muted badge only.", toneRule: "No alarm language." },
  { severity: "medium", label: "Medium", displayRule: "Amber badge or subtle warning card.", toneRule: "Highlight what could change." },
  { severity: "high", label: "High", displayRule: "Rose or amber warning treatment.", toneRule: "State risk and invalidation clearly." },
  { severity: "critical", label: "Critical", displayRule: "Use only for immediate structural risk or severe data confidence issues.", toneRule: "Be direct and concise." },
]

export const quantLayoutRules: QuantLayoutRule[] = [
  {
    name: "Question-first flow",
    rule: "Organize user-facing replay around questions, not engine names.",
    replayImplication: "Use What Happened, Why, History, Worked Before, Watch, Advanced.",
  },
  {
    name: "Advanced tools last",
    rule: "Operational tools belong at the bottom and collapsed by default.",
    replayImplication: "Data Operations Workbench must not interrupt investigation flow.",
  },
  {
    name: "One primary card",
    rule: "Each screen region should have one dominant primary card.",
    replayImplication: "Case Brief is the only primary card in Replay.",
  },
  {
    name: "No nested card stacks",
    rule: "Avoid card-in-card nesting deeper than one level.",
    replayImplication: "Use compact subcards for evidence, not full panels inside panels.",
  },
]

export const quantSpacingRules: QuantSpacingRule[] = [
  { token: "section_gap", value: "gap-3", usage: "Default vertical rhythm for dense dashboard sections." },
  { token: "card_padding", value: "p-4", usage: "Default panel padding." },
  { token: "compact_card_padding", value: "p-3", usage: "Nested evidence, signal, and decision cards." },
  { token: "micro_gap", value: "gap-2", usage: "Rows of badges and compact metric grids." },
  { token: "border_radius", value: "rounded-xl outer, rounded-lg inner", usage: "Keep terminal surfaces crisp and premium." },
]

export const quantTypographyRules: QuantTypographyRule[] = [
  { role: "section_eyebrow", recommendedClasses: "text-[10px] font-black uppercase tracking-[0.26em]", usage: "Use for section identity and question anchors." },
  { role: "metric_label", recommendedClasses: "text-[9px] font-black uppercase tracking-[0.16em]", usage: "Use for compact labels above metrics." },
  { role: "body", recommendedClasses: "text-xs leading-5", usage: "Use for dense explanatory text." },
  { role: "primary_title", recommendedClasses: "text-2xl font-black", usage: "Use only in Case Brief or equivalent primary surface." },
  { role: "badge", recommendedClasses: "text-[9px] font-black uppercase tracking-[0.12em]", usage: "Use for confidence, state, severity, and mode labels." },
]

export const quantDensityRules: QuantDensityRule[] = [
  {
    mode: "beginner",
    intendedUser: "First-time user or non-specialist reviewing a replay.",
    defaultDisclosure: "Show Level 1 only; guide through Continue Investigation.",
    copyRule: "Use plain question labels and avoid engine names.",
    cardRule: "Prefer fewer cards with stronger summaries.",
  },
  {
    mode: "trader",
    intendedUser: "Active trader looking for tactical review and future watch items.",
    defaultDisclosure: "Show Level 1 and key action signals; keep history and agent detail collapsed.",
    copyRule: "Use decision, invalidation, risk, and watch language.",
    cardRule: "Prioritize Possible Drivers, Playbook, and Watch signals.",
  },
  {
    mode: "research",
    intendedUser: "Analyst inspecting historical memory, source quality, and record relationships.",
    defaultDisclosure: "Allow advanced sections, query, graph, and inspector access.",
    copyRule: "Expose source, confidence, analog, and record lineage language.",
    cardRule: "Use denser tables/lists and score/link metadata.",
  },
]

