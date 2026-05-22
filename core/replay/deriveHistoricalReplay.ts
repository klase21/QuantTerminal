import type { GeoNarrativeSurface } from "@/core/geoNarrativeTypes"
import type { NarrativeSurface } from "@/core/narrative/narrativeTypes"
import type { HistoricalReplayCaseStudy, HistoricalReplayFrame, HistoricalReplaySurface, ReplayIntensityState, ReplayWindow } from "@/core/replay/historicalReplayTypes"
import { clamp } from "@/core/shared/metrics"

function frameCount(window: ReplayWindow) {
  if (window === "30D") return 30
  if (window === "90D") return 45
  return 60
}

function lifecycleFromProgress(progress: number, heat: number) {
  if (progress > 0.90 || heat < 24) return "EXITING" as const
  if (heat >= 86) return "OVERCROWDED" as const
  if (progress >= 0.64 && heat >= 68) return "VIRAL" as const
  if (progress >= 0.30 && heat >= 42) return "EXPANDING" as const
  if (heat >= 24) return "EARLY" as const
  return "QUIET" as const
}

function replayState(args: { intensity: number; crowding: number; progress: number }): ReplayIntensityState {
  const { intensity, crowding, progress } = args
  if (progress > 0.88 || intensity < 22) return "Fading"
  if (crowding >= 78) return "Overheated"
  if (intensity >= 62) return "Accelerating"
  if (intensity >= 32) return "Forming"
  return "Quiet"
}

function stateNote(state: ReplayIntensityState, lead: string) {
  switch (state) {
    case "Accelerating":
      return `${lead} is gaining participation with enough liquidity to keep the replay in expansion mode.`
    case "Overheated":
      return `${lead} is replaying as a crowded phase. Treat follow-through as fragile unless breadth keeps improving.`
    case "Fading":
      return `${lead} is losing replay momentum. Watch for liquidity fading or regional rejection.`
    case "Forming":
      return `${lead} is forming but still needs confirmation from breadth and regional participation.`
    default:
      return "No dominant replay impulse is confirmed in this frame."
  }
}

function caseStudyFromFrames(frames: HistoricalReplayFrame[]): HistoricalReplayCaseStudy {
  const current = frames[frames.length - 1]
  const peak = [...frames].sort((a, b) => b.intensity - a.intensity)[0]
  const firstActive = frames.find((frame) => frame.replayState !== "Quiet")
  const overheating = frames.find((frame) => frame.replayState === "Overheated")

  if (!current || !peak) {
    return {
      title: "Replay waiting for data",
      thesis: "Historical replay requires live rotation and narrative surfaces before it can compress a case study.",
      sequence: ["Waiting for live market state"],
      risk: "No replay risk available yet.",
      confidence: 0,
    }
  }

  return {
    title: `${peak.leadNarrative} replay peak: ${peak.replayState}`,
    thesis: `${peak.leadNarrative} reached peak replay intensity at ${Math.round(peak.intensity)} with ${peak.lifecycle.toLowerCase()} lifecycle pressure.`,
    sequence: [
      firstActive ? `${firstActive.timestampLabel}: ${firstActive.leadNarrative} started forming` : "No clear formation frame",
      `${peak.timestampLabel}: intensity peaked at ${Math.round(peak.intensity)}`,
      overheating ? `${overheating.timestampLabel}: crowding risk entered overheated territory` : "No overheated frame detected",
      `${current.timestampLabel}: current replay state is ${current.replayState}`,
    ],
    risk: overheating
      ? "Crowding appeared before the final frame. Reduce confidence if liquidity fades or breadth narrows."
      : "Replay is not showing extreme crowding yet; confirmation quality matters more than raw heat.",
    confidence: current.confidence,
  }
}

export function deriveHistoricalReplaySurface(
  narrative: NarrativeSurface,
  window: ReplayWindow,
  activeIndex = 0
): HistoricalReplaySurface {
  const count = frameCount(window)
  const heatLeaders = narrative.heatmap.length ? narrative.heatmap : []
  const lifecycle = narrative.lifecycle.length ? narrative.lifecycle : []
  const geo: GeoNarrativeSurface | undefined = narrative.geoNarrative
  const notes: string[] = []

  if (!heatLeaders.length) {
    notes.push("Replay is using empty-state frames because no narrative heatmap is available.")
  }

  const frames: HistoricalReplayFrame[] = Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 1 : index / (count - 1)
    const leader = heatLeaders[index % Math.max(1, heatLeaders.length)]
    const life = lifecycle.find((item) => item.narrative === leader?.narrative) ?? lifecycle[index % Math.max(1, lifecycle.length)]
    const leadNarrative = leader?.narrative ?? life?.narrative ?? "Market"
    const baseHeat = leader?.heat ?? life?.velocity ?? 0
    const wave = Math.sin(progress * Math.PI) * 18
    const lateDecay = progress > 0.82 ? (progress - 0.82) * 90 : 0
    const intensity = clamp(baseHeat * (0.58 + progress * 0.38) + wave - lateDecay)
    const crowding = clamp((life?.crowdRisk ?? 0) * (0.65 + progress * 0.30) + Math.max(0, intensity - 72) * 0.45)
    const participation = clamp((life?.velocity ?? baseHeat) * (0.60 + progress * 0.35))
    const replay = replayState({ intensity, crowding, progress })
    const derivedLifecycle = life?.phase ?? lifecycleFromProgress(progress, intensity)
    const direction = leader?.direction === "MIXED" || !leader?.direction ? "CHURN" : leader.direction
    const timestampLabel = window === "30D" ? `D-${count - index}` : window === "90D" ? `W-${Math.ceil((count - index) / 5)}` : `M-${Math.ceil((count - index) / 8)}`

    return {
      id: `historical-replay-${window}-${index}`,
      index,
      label: `${Math.round(progress * 100)}%`,
      timestampLabel,
      leadNarrative,
      lifecycle: derivedLifecycle,
      direction,
      diffusion: geo?.diffusion ?? "NO_CLEAR_FLOW",
      intensity,
      confidence: clamp((life?.confidence ?? narrative.heatmap[0]?.heat ?? 0) * 0.70 + intensity * 0.30),
      participation,
      crowding,
      breadth: clamp((narrative.sourceSectors[0]?.breadth ?? 0) * (0.68 + progress * 0.24)),
      liquidity: clamp((narrative.sourceSectors[0]?.volumePressure ?? 0) * (0.66 + progress * 0.26)),
      replayState: replay,
      headline: `${leadNarrative} ${replay}`,
      operatorNote: stateNote(replay, leadNarrative),
    }
  })

  const boundedIndex = Math.min(Math.max(0, activeIndex), Math.max(0, frames.length - 1))
  const current = frames[boundedIndex] ?? null
  const caseStudy = caseStudyFromFrames(frames)
  const compressedSummary = current
    ? `${current.leadNarrative} is replaying as ${current.replayState.toLowerCase()} with ${Math.round(current.confidence)} confidence.`
    : "Replay is waiting for narrative state."

  return {
    ok: frames.length > 0,
    generatedAt: new Date().toISOString(),
    window,
    frames,
    activeIndex: boundedIndex,
    current,
    caseStudy,
    compressedSummary,
    notes,
  }
}
