import type { ReplayCase } from "@/core/replay/replayTypes"

export interface TacticalPlaybook {
  lesson: string
  mistake: string
  confirmation: string
  bestExecutionCondition: string
  worstExecutionCondition: string
  playbook: string[]
  executionChecklist: string[]
  invalidationChecklist: string[]
}

function strongestDriver(replay: ReplayCase) {
  const drivers = replay.frames.flatMap((frame) => frame.narrative.possibleDrivers)
  return [...drivers].sort((a, b) => b.confidence - a.confidence)[0]
}

function latestFrame(replay: ReplayCase) {
  return replay.frames[replay.frames.length - 1] ?? replay.frames[0]
}

function fundingRead(replay: ReplayCase) {
  const frame = latestFrame(replay)
  if (!frame) return "funding unavailable"
  const funding = Math.abs(frame.market.fundingRate)
  if (funding >= 0.03) return "overheated funding"
  if (funding >= 0.01) return "moderate funding pressure"
  return "low funding pressure"
}

function oiRead(replay: ReplayCase) {
  const frame = latestFrame(replay)
  if (!frame) return "OI unavailable"
  if (frame.market.openInterestChangePct > 2) return "OI expansion"
  if (frame.market.openInterestChangePct < -2) return "OI compression"
  return "flat OI"
}

function lessonFromReplay(replay: ReplayCase) {
  if (replay.verdict === "Reality Diverged") {
    return "Narrative attribution alone was insufficient; flow and market structure carried the useful signal."
  }
  if (replay.verdict === "Narrative Failed") {
    return "The headline narrative failed because confirmation evidence did not arrive."
  }
  return "The event worked best when narrative, expectation, flow, and structure confirmed each other."
}

function mistakeFromReplay(replay: ReplayCase) {
  if (replay.verdict === "Narrative Confirmed") {
    return "Chasing the first impulse before confirmation created the weakest entry quality."
  }
  if (replay.verdict === "Reality Diverged") {
    return "Assuming the visible headline was the primary driver before checking positioning."
  }
  return "Treating attention as evidence instead of validating the driver stack."
}

export function getTacticalPlaybook(replay: ReplayCase): TacticalPlaybook {
  const driver = strongestDriver(replay)
  const frame = latestFrame(replay)
  const funding = fundingRead(replay)
  const oi = oiRead(replay)
  const confirmation =
    driver?.driver && frame
      ? `${driver.driver} + ${oi} + ${funding}`
      : `${oi} + ${funding} + structure confirmation`

  return {
    lesson: lessonFromReplay(replay),
    mistake: mistakeFromReplay(replay),
    confirmation,
    bestExecutionCondition:
      replay.verdict === "Narrative Confirmed"
        ? "Enter after the first reset holds and expectation/flow remain aligned."
        : "Wait for flow confirmation before following the narrative label.",
    worstExecutionCondition:
      replay.verdict === "Narrative Confirmed"
        ? "Late chase after probability and price have already repriced."
        : "Entering on headline attribution while OI/funding/liquidity contradict the story.",
    playbook: [
      "Identify the claimed narrative and timestamp the first market reaction.",
      "Check OI trend before assigning the driver.",
      "Check funding pressure and whether leverage is crowded.",
      "Check liquidity behavior around the first support or resistance test.",
      "Confirm expectation repricing before following the narrative.",
    ],
    executionChecklist: [
      "Funding checked",
      "OI checked",
      "Liquidity checked",
      "Market structure confirmed",
      "Expectation layer reviewed",
    ],
    invalidationChecklist: [
      "OI expanding against the thesis",
      "Funding diverging from expected positioning",
      "Narrative unsupported by flow",
      "Failed reclaim or failed acceptance at the key level",
    ],
  }
}
