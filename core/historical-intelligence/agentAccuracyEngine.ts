import type { ReplayAgentName, ReplayAgentSummary, ReplayCase } from "@/core/replay/replayTypes"
import { getReplayCaseCatalog, type ReplayCaseCatalogEntry } from "./mockHistoricalIntelligenceRepository"

type ScoredAgent = ReplayAgentSummary & {
  replay: ReplayCase
  eventType: ReplayCaseCatalogEntry["eventType"]
}

export interface AgentAccuracyStat {
  agent: Exclude<ReplayAgentName, "Final Verdict / Narrative vs Reality">
  sampleSize: number
  accuracyScore: number
  confidenceCalibrationScore: number
  caseAlignment?: "right" | "early" | "late" | "wrong" | "catalog"
  alignmentRead?: string
  strongestEnvironment: string
  weakestEnvironment: string
  commonFailurePattern: string
  bestExampleReplayCase: string
  worstExampleReplayCase: string
  tacticalTakeaway: string
  fallbackNote?: string
}

export interface AgentAccuracyQuery {
  caseId?: string
  replay?: ReplayCase
}

const AGENTS: AgentAccuracyStat["agent"][] = [
  "Technical Agent",
  "Flow Agent",
  "Narrative Agent",
  "Expectation Agent",
  "Risk Agent",
]

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function scoreAgent(agent: ScoredAgent) {
  const verdict = agent.replay.verdict
  const summary = `${agent.summary} ${agent.watch}`.toLowerCase()
  let score = 48

  if (agent.agent === "Technical Agent") {
    if (summary.includes("support failed") || summary.includes("acceptance") || summary.includes("range")) score += 18
    if (verdict === "Narrative Confirmed" && agent.tone === "BULLISH") score += 16
    if (verdict !== "Narrative Confirmed" && ["BEARISH", "DEFENSIVE", "MIXED"].includes(agent.tone)) score += 12
  }

  if (agent.agent === "Flow Agent") {
    if (summary.includes("oi") || summary.includes("funding") || summary.includes("futures")) score += 22
    if (verdict === "Reality Diverged" || agent.eventType === "liquidity") score += 14
    if (agent.tone === "DEFENSIVE" && verdict !== "Narrative Confirmed") score += 8
  }

  if (agent.agent === "Narrative Agent") {
    if (verdict === "Narrative Confirmed" && agent.tone === "BULLISH") score += 22
    if (summary.includes("causality remained weak") || summary.includes("no external news")) score += 16
    if (verdict === "Reality Diverged" && agent.tone === "BULLISH") score -= 20
  }

  if (agent.agent === "Expectation Agent") {
    if (summary.includes("probability") || summary.includes("expectation") || summary.includes("priced")) score += 18
    if (verdict === "Narrative Confirmed" && ["BULLISH", "MIXED"].includes(agent.tone)) score += 12
    if (verdict !== "Narrative Confirmed" && ["MIXED", "DEFENSIVE", "BEARISH"].includes(agent.tone)) score += 10
  }

  if (agent.agent === "Risk Agent") {
    if (summary.includes("late") || summary.includes("chase") || summary.includes("risk") || summary.includes("avoid")) score += 22
    if (["DEFENSIVE", "MIXED"].includes(agent.tone)) score += 12
    if (verdict !== "Narrative Confirmed") score += 8
  }

  return clamp(score)
}

function calibrationScore(agent: ScoredAgent, accuracyScore: number) {
  return clamp(100 - Math.abs(agent.confidence - accuracyScore))
}

function environmentLabel(item: ScoredAgent) {
  return `${item.eventType} / ${item.replay.symbol}`
}

function failurePattern(agent: AgentAccuracyStat["agent"]) {
  if (agent === "Narrative Agent") return "Overweights attention when flow confirmation is weak."
  if (agent === "Expectation Agent") return "Needs real odds history to separate priced-in events from surprise."
  if (agent === "Technical Agent") return "Can miss causality when structure reacts before driver evidence is clear."
  if (agent === "Flow Agent") return "Can underweight policy or macro catalysts when positioning is calm."
  return "Can become too defensive after the highest-risk move has already passed."
}

function takeaway(agent: AgentAccuracyStat["agent"], score: number) {
  if (score >= 78) return `${agent} is high-signal in the current mock replay catalog; weight it early in event triage.`
  if (score >= 65) return `${agent} is useful when paired with confirmation from the rest of the committee.`
  return `${agent} needs cross-checking before it drives execution decisions.`
}

function caseAlignment(agent: ScoredAgent, score: number): NonNullable<AgentAccuracyStat["caseAlignment"]> {
  if (score >= 78) return "right"
  if (score >= 68) return agent.confidence >= 78 ? "early" : "right"
  if (score >= 58) return agent.confidence >= 78 ? "wrong" : "late"
  return "wrong"
}

function alignmentRead(agent: ScoredAgent, alignment: NonNullable<AgentAccuracyStat["caseAlignment"]>) {
  if (alignment === "right") return `${agent.agent} aligned with the final replay verdict.`
  if (alignment === "early") return `${agent.agent} flagged the right direction before full confirmation.`
  if (alignment === "late") return `${agent.agent} was directionally useful but needed more confirmation.`
  if (alignment === "wrong") return `${agent.agent} should be cross-checked before driving similar setups.`
  return `${agent.agent} is using catalog-level mock accuracy.`
}

function catalogEntriesForQuery(query?: AgentAccuracyQuery) {
  const catalog = getReplayCaseCatalog()
  if (query?.replay) {
    const entry = catalog.find((item) => item.replay.id === query.replay?.id)
    return [
      entry ?? {
        id: query.replay.id,
        eventType: "mixed" as ReplayCaseCatalogEntry["eventType"],
        shockLevel: "medium" as ReplayCaseCatalogEntry["shockLevel"],
        replay: query.replay,
      },
    ]
  }
  if (query?.caseId) {
    const entry = catalog.find((item) => item.replay.id === query.caseId)
    return entry ? [entry] : catalog
  }
  return catalog
}

export function getAgentAccuracyStats(query?: AgentAccuracyQuery): AgentAccuracyStat[] {
  const entries = catalogEntriesForQuery(query)
  const usedFallback = Boolean(query?.caseId && !entries.some((entry) => entry.replay.id === query.caseId))
  const catalogMode = !query?.caseId && !query?.replay
  const scoredAgents: ScoredAgent[] = entries.flatMap((entry) =>
    entry.replay.frames.slice(-1).flatMap((frame) =>
      frame.agents
        .filter((agent): agent is ReplayAgentSummary & { agent: AgentAccuracyStat["agent"] } =>
          AGENTS.includes(agent.agent as AgentAccuracyStat["agent"]),
        )
        .map((agent) => ({
          ...agent,
          replay: entry.replay,
          eventType: entry.eventType,
        })),
    ),
  )

  return AGENTS.map((agentName) => {
    const samples = scoredAgents.filter((sample) => sample.agent === agentName)
    const scored = samples.map((sample) => ({
      sample,
      accuracy: scoreAgent(sample),
    }))
    const best = [...scored].sort((a, b) => b.accuracy - a.accuracy)[0]
    const worst = [...scored].sort((a, b) => a.accuracy - b.accuracy)[0]
    const accuracyScore = clamp(average(scored.map((item) => item.accuracy)))
    const caseSample = scored[0]?.sample
    const alignment = catalogMode || !caseSample ? "catalog" : caseAlignment(caseSample, accuracyScore)

    return {
      agent: agentName,
      sampleSize: samples.length,
      accuracyScore,
      confidenceCalibrationScore: clamp(
        average(scored.map((item) => calibrationScore(item.sample, item.accuracy))),
      ),
      caseAlignment: alignment,
      alignmentRead: caseSample ? alignmentRead(caseSample, alignment) : `${agentName} has no case-specific sample.`,
      strongestEnvironment: best ? environmentLabel(best.sample) : "Insufficient mock history",
      weakestEnvironment: worst ? environmentLabel(worst.sample) : "Insufficient mock history",
      commonFailurePattern: failurePattern(agentName),
      bestExampleReplayCase: best?.sample.replay.title ?? "Insufficient mock history",
      worstExampleReplayCase: worst?.sample.replay.title ?? "Insufficient mock history",
      tacticalTakeaway: catalogMode
        ? takeaway(agentName, accuracyScore)
        : `${agentName} is ${alignment} for this selected replay; use this as a mock lesson for similar setups.`,
      fallbackNote: usedFallback ? "Selected case was not found; using catalog-level mock accuracy." : undefined,
    }
  }).sort((a, b) => b.accuracyScore - a.accuracyScore)
}
