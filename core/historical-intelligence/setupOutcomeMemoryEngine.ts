import type { ReplayCase, ReplayFrame } from "@/core/replay/replayTypes"
import {
  getReplayCaseCatalog,
  getSetupOutcomeStats,
  type HistoricalReplayEventType,
  type ReplayCaseCatalogEntry,
} from "./mockHistoricalIntelligenceRepository"
import type { ReplayCaseStorageRecord, SimilarEventQuery } from "./historicalIntelligenceTypes"

type ShockLevel = NonNullable<ReplayCaseStorageRecord["shockLevel"]>
type FundingRegime = "low" | "moderate" | "high"
type OpenInterestRegime = "contracting" | "flat" | "expanding"

export interface SetupOutcomeMemoryQuery extends SimilarEventQuery {
  shockLevel?: ShockLevel
  dominantDriver?: string
  verdict?: ReplayCase["verdict"]
}

export interface SetupOutcomeMemorySummary {
  sampleSize: number
  winRate: number
  averageMovePct: number
  maxAdverseMovePct: number
  commonFailureMode: string
  bestHistoricalCondition: string
  worstHistoricalCondition: string
  tacticalLesson: string
  groupedBy: {
    eventType?: HistoricalReplayEventType
    shockLevel?: ShockLevel
    symbol?: string
    dominantDriver?: string
    fundingRegime?: FundingRegime
    openInterestRegime?: OpenInterestRegime
    verdict?: ReplayCase["verdict"]
  }
}

interface SetupCaseProfile {
  entry: ReplayCaseCatalogEntry
  dominantDriver: string
  driverTags: string[]
  fundingRegime: FundingRegime
  openInterestRegime: OpenInterestRegime
  movePct: number
  adverseMovePct: number
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function tokenize(value: string) {
  return normalizeToken(value)
    .split(" ")
    .filter((token) => token.length > 2)
}

function fundingRegime(frame: ReplayFrame): FundingRegime {
  const funding = Math.abs(frame.market.fundingRate)
  if (funding >= 0.03) return "high"
  if (funding >= 0.01) return "moderate"
  return "low"
}

function openInterestRegime(frame: ReplayFrame): OpenInterestRegime {
  if (frame.market.openInterestChangePct > 2) return "expanding"
  if (frame.market.openInterestChangePct < -2) return "contracting"
  return "flat"
}

function priceMovePct(replay: ReplayCase) {
  const first = replay.frames[0]?.market.price ?? 0
  const last = replay.frames[replay.frames.length - 1]?.market.price ?? first
  if (!first) return 0
  return ((last - first) / first) * 100
}

function maxAdverseMovePct(replay: ReplayCase) {
  const first = replay.frames[0]?.market.price ?? 0
  if (!first) return 0
  return Math.min(...replay.frames.map((frame) => ((frame.market.price - first) / first) * 100))
}

function profileFromEntry(entry: ReplayCaseCatalogEntry): SetupCaseProfile {
  const replay = entry.replay
  const lastFrame = replay.frames[replay.frames.length - 1] ?? replay.frames[0]
  const drivers = replay.frames.flatMap((frame) => frame.narrative.possibleDrivers)
  const dominantDriver = [...drivers].sort((a, b) => b.confidence - a.confidence)[0]?.driver ?? "Unknown driver"

  return {
    entry,
    dominantDriver,
    driverTags: tokenize(dominantDriver),
    fundingRegime: lastFrame ? fundingRegime(lastFrame) : "low",
    openInterestRegime: lastFrame ? openInterestRegime(lastFrame) : "flat",
    movePct: priceMovePct(replay),
    adverseMovePct: maxAdverseMovePct(replay),
  }
}

function profileFromReplay(replay: ReplayCase, catalog: ReplayCaseCatalogEntry[]) {
  return profileFromEntry(catalog.find((entry) => entry.id === replay.id) ?? {
    id: replay.id,
    eventType: "mixed",
    shockLevel: "medium",
    replay,
  })
}

function profileMatches(target: SetupCaseProfile | SetupOutcomeMemoryQuery, profile: SetupCaseProfile) {
  if ("entry" in target) {
    const driverOverlap = target.driverTags.some((tag) => profile.driverTags.includes(tag))
    return (
      profile.entry.eventType === target.entry.eventType ||
      profile.entry.shockLevel === target.entry.shockLevel ||
      profile.entry.replay.symbol === target.entry.replay.symbol ||
      profile.entry.replay.verdict === target.entry.replay.verdict ||
      profile.fundingRegime === target.fundingRegime ||
      profile.openInterestRegime === target.openInterestRegime ||
      driverOverlap
    )
  }

  if (target.eventType && target.eventType !== profile.entry.eventType) return false
  if (target.shockLevel && target.shockLevel !== profile.entry.shockLevel) return false
  if (target.symbol && target.symbol !== profile.entry.replay.symbol) return false
  if (target.verdict && target.verdict !== profile.entry.replay.verdict) return false
  if (target.dominantDriver) {
    const queryDriverTags = tokenize(target.dominantDriver)
    return queryDriverTags.some((tag) => profile.driverTags.includes(tag))
  }
  return true
}

function failureMode(profiles: SetupCaseProfile[]) {
  const failedNarrative = profiles.filter((profile) => profile.entry.replay.verdict !== "Narrative Confirmed")
  if (failedNarrative.length) return "Narrative attribution outran confirming flow evidence."
  if (profiles.some((profile) => profile.fundingRegime === "high")) return "Overheated funding made late entries fragile."
  return "Low shock or weak confirmation reduced tactical edge."
}

function conditionLabel(profile: SetupCaseProfile) {
  return `${profile.entry.eventType} / ${profile.entry.shockLevel} shock / ${profile.dominantDriver}`
}

export function getSetupOutcomeMemory(replayOrQuery: ReplayCase | SetupOutcomeMemoryQuery): SetupOutcomeMemorySummary {
  const catalog = getReplayCaseCatalog()
  const profiles = catalog.map(profileFromEntry)
  const target = "frames" in replayOrQuery ? profileFromReplay(replayOrQuery, catalog) : replayOrQuery
  const matchedProfiles = profiles.filter((profile) => profileMatches(target, profile))
  const sample = matchedProfiles.length ? matchedProfiles : profiles
  const averageMovePct = sample.reduce((sum, profile) => sum + profile.movePct, 0) / sample.length
  const worstAdverseMovePct = Math.min(...sample.map((profile) => profile.adverseMovePct))
  const best = [...sample].sort((a, b) => b.movePct - a.movePct)[0] ?? sample[0]
  const worst = [...sample].sort((a, b) => a.movePct - b.movePct)[0] ?? sample[0]
  const repositoryStats = getSetupOutcomeStats({
    symbol: "entry" in target ? target.entry.replay.symbol : target.symbol,
    eventType: "entry" in target ? target.entry.eventType : target.eventType,
  })
  const groupedBy =
    "entry" in target
      ? {
          eventType: target.entry.eventType,
          shockLevel: target.entry.shockLevel,
          symbol: target.entry.replay.symbol,
          dominantDriver: target.dominantDriver,
          fundingRegime: target.fundingRegime,
          openInterestRegime: target.openInterestRegime,
          verdict: target.entry.replay.verdict,
        }
      : {
          eventType: target.eventType,
          shockLevel: target.shockLevel,
          symbol: target.symbol,
          dominantDriver: target.dominantDriver,
          verdict: target.verdict,
        }

  return {
    sampleSize: sample.length,
    winRate: repositoryStats.winRate,
    averageMovePct: Number(averageMovePct.toFixed(2)),
    maxAdverseMovePct: Number(worstAdverseMovePct.toFixed(2)),
    commonFailureMode: failureMode(sample),
    bestHistoricalCondition: best ? conditionLabel(best) : "Insufficient mock history",
    worstHistoricalCondition: worst ? conditionLabel(worst) : "Insufficient mock history",
    tacticalLesson:
      repositoryStats.falseNarrativeRate && repositoryStats.falseNarrativeRate > 30
        ? "Require flow confirmation before accepting the narrative label as the driver."
        : "Best results came when narrative, flow, and risk state agreed before execution.",
    groupedBy,
  }
}
