import type { ReplayCase, ReplayDriverRanking, ReplayFrame } from "@/core/replay/replayTypes"
import {
  getReplayCaseCatalog,
  type HistoricalReplayEventType,
  type ReplayCaseCatalogEntry,
} from "./mockHistoricalIntelligenceRepository"
import type { ReplayCaseStorageRecord, SimilarEventMatch, SimilarEventMatchReason, SimilarEventQuery } from "./historicalIntelligenceTypes"

type ShockLevel = NonNullable<ReplayCaseStorageRecord["shockLevel"]>

interface ReplayCaseSignature {
  caseId: string
  title: string
  symbol: string
  eventType: HistoricalReplayEventType
  shockLevel: ShockLevel
  narrativeTags: string[]
  driverTags: string[]
  fundingRegime: "low" | "moderate" | "high"
  openInterestRegime: "contracting" | "flat" | "expanding"
  verdict: ReplayCase["verdict"]
  outcome: string
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function tokenize(value: string) {
  return normalizeToken(value)
    .split(" ")
    .filter((token) => token.length > 2)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function overlap(left: string[], right: string[]) {
  const rightSet = new Set(right)
  return left.filter((value) => rightSet.has(value))
}

function fundingRegime(frame: ReplayFrame) {
  const funding = Math.abs(frame.market.fundingRate)
  if (funding >= 0.03) return "high"
  if (funding >= 0.01) return "moderate"
  return "low"
}

function openInterestRegime(frame: ReplayFrame) {
  if (frame.market.openInterestChangePct > 2) return "expanding"
  if (frame.market.openInterestChangePct < -2) return "contracting"
  return "flat"
}

function driverTags(drivers: ReplayDriverRanking[]) {
  return unique(drivers.flatMap((driver) => [...tokenize(driver.driver), ...tokenize(driver.evidence)]))
}

function narrativeTags(replay: ReplayCase) {
  return unique(
    replay.frames.flatMap((frame) => [
      ...tokenize(frame.narrative.primaryNarrative),
      ...tokenize(frame.narrative.summary),
      ...frame.narrative.items.flatMap((item) => [...tokenize(item.narrative), ...tokenize(item.headline)]),
    ]),
  )
}

function signatureFromEntry(entry: ReplayCaseCatalogEntry): ReplayCaseSignature {
  const replay = entry.replay
  const lastFrame = replay.frames[replay.frames.length - 1] ?? replay.frames[0]

  return {
    caseId: replay.id,
    title: replay.title,
    symbol: replay.symbol,
    eventType: entry.eventType,
    shockLevel: entry.shockLevel,
    narrativeTags: narrativeTags(replay),
    driverTags: driverTags(replay.frames.flatMap((frame) => frame.narrative.possibleDrivers)),
    fundingRegime: lastFrame ? fundingRegime(lastFrame) : "low",
    openInterestRegime: lastFrame ? openInterestRegime(lastFrame) : "flat",
    verdict: replay.verdict,
    outcome: replay.outcome,
  }
}

function querySignature(query: SimilarEventQuery, catalog: ReplayCaseCatalogEntry[]): Partial<ReplayCaseSignature> {
  return {
    symbol: query.symbol,
    eventType: query.eventType,
    narrativeTags: query.tags?.map(normalizeToken),
    caseId: catalog.find((entry) => entry.id === query.tags?.[0])?.id,
  }
}

function reasonsAndScore(target: Partial<ReplayCaseSignature>, candidate: ReplayCaseSignature) {
  const reasons: SimilarEventMatchReason[] = []
  let score = 18

  if (target.eventType && target.eventType === candidate.eventType) {
    score += 20
    reasons.push("same_event_type")
  }

  if (target.symbol && target.symbol === candidate.symbol) {
    score += 14
    reasons.push("same_symbol")
  }

  if (target.shockLevel && target.shockLevel === candidate.shockLevel) {
    score += 10
    reasons.push("similar_shock_level")
  }

  const narrativeOverlap = overlap(target.narrativeTags ?? [], candidate.narrativeTags)
  if (narrativeOverlap.length) {
    score += Math.min(16, narrativeOverlap.length * 3)
    reasons.push("similar_narrative")
  }

  const driverOverlap = overlap(target.driverTags ?? [], candidate.driverTags)
  if (driverOverlap.length) {
    score += Math.min(14, driverOverlap.length * 4)
    reasons.push("similar_driver_ranking")
  }

  if (target.fundingRegime && target.fundingRegime === candidate.fundingRegime) {
    score += 8
    reasons.push("similar_funding")
  }

  if (target.openInterestRegime && target.openInterestRegime === candidate.openInterestRegime) {
    score += 8
    reasons.push("similar_open_interest")
  }

  if (target.verdict && target.verdict === candidate.verdict) {
    score += 10
    reasons.push("similar_verdict", "similar_outcome")
  }

  if (candidate.eventType === "macro") reasons.push("similar_macro_context")
  if (candidate.eventType === "crypto_policy") reasons.push("similar_prediction_market_expectation")

  return {
    score: Math.min(100, score),
    reasons: unique(reasons) as SimilarEventMatchReason[],
    matchedTags: unique([...narrativeOverlap, ...driverOverlap]).slice(0, 8),
  }
}

function keyDifferences(target: Partial<ReplayCaseSignature>, candidate: ReplayCaseSignature) {
  const differences: string[] = []
  if (target.eventType && target.eventType !== candidate.eventType) {
    differences.push(`Event type differs: ${candidate.eventType}`)
  }
  if (target.symbol && target.symbol !== candidate.symbol) {
    differences.push(`Asset differs: ${candidate.symbol}`)
  }
  if (target.shockLevel && target.shockLevel !== candidate.shockLevel) {
    differences.push(`Shock level differs: ${candidate.shockLevel}`)
  }
  if (target.verdict && target.verdict !== candidate.verdict) {
    differences.push(`Verdict differs: ${candidate.verdict}`)
  }
  if (target.fundingRegime && target.fundingRegime !== candidate.fundingRegime) {
    differences.push(`Funding regime differs: ${candidate.fundingRegime}`)
  }
  return differences.slice(0, 3)
}

function takeaway(score: number, candidate: ReplayCaseSignature, reasons: SimilarEventMatchReason[]) {
  if (score >= 78) {
    return `Strong rhyme: compare driver evidence against ${candidate.title} before trusting the headline narrative.`
  }
  if (reasons.includes("similar_driver_ranking")) {
    return `Driver overlap matters more than surface narrative; use ${candidate.title} as a positioning check.`
  }
  if (reasons.includes("same_event_type")) {
    return `Same event family, but verify whether liquidity and verdict matched before applying the lesson.`
  }
  return `Loose historical rhyme; useful as context, not as a direct playbook.`
}

export function findSimilarReplayCases(
  replayOrQuery: ReplayCase | SimilarEventQuery,
  limit = 3,
): SimilarEventMatch[] {
  const catalog = getReplayCaseCatalog()
  const targetEntry =
    "frames" in replayOrQuery ? catalog.find((entry) => entry.replay.id === replayOrQuery.id) : undefined
  const target =
    "frames" in replayOrQuery && targetEntry
      ? signatureFromEntry(targetEntry)
      : querySignature(replayOrQuery as SimilarEventQuery, catalog)

  return catalog
    .map(signatureFromEntry)
    .filter((candidate) => candidate.caseId !== target.caseId)
    .map((candidate) => {
      const scored = reasonsAndScore(target, candidate)

      return {
        caseId: candidate.caseId,
        title: candidate.title,
        symbol: candidate.symbol,
        timestamp: "mock-catalog",
        similarityScore: scored.score,
        reasons: scored.reasons,
        matchedTags: scored.matchedTags,
        outcome: candidate.outcome,
        verdict: candidate.verdict,
        operatorRead: candidate.outcome,
        keyDifferences: keyDifferences(target, candidate),
        takeaway: takeaway(scored.score, candidate, scored.reasons),
      }
    })
    .filter((match) => match.similarityScore >= (("frames" in replayOrQuery ? 0 : replayOrQuery.minSimilarityScore) ?? 0))
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit)
}
