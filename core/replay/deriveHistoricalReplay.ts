import type { NarrativeSurface, NarrativeStoryStep } from "@/core/narrative/narrativeTypes"
import type { SectorRotationSnapshot } from "@/core/marketDataTypes"

export type HistoricalReplayWindow = "30D" | "90D" | "180D"

export interface HistoricalReplayFrame {
  id: string
  index: number
  label: string
  phase: string
  regime: string
  leader: string
  direction: string
  intensity: number
  narrative: string
  detail: string
  alertCount: number
  temperature: number
}

export interface HistoricalReplaySurface {
  ok: boolean
  generatedAt: string
  window: HistoricalReplayWindow
  frames: HistoricalReplayFrame[]
  notes: string[]
}

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function frameCount(window: HistoricalReplayWindow) {
  if (window === "30D") return 30
  if (window === "90D") return 45
  return 60
}

function phaseFromProgress(progress: number) {
  if (progress < 0.2) return "SCAN"
  if (progress < 0.42) return "CHURN"
  if (progress < 0.68) return "INFLOW"
  if (progress < 0.88) return "EXPANSION"
  return "WATCH"
}

function pickStory(storyTimeline: NarrativeStoryStep[], index: number) {
  if (!storyTimeline.length) return undefined
  return storyTimeline[index % storyTimeline.length]
}

function pickLeader(sectors: SectorRotationSnapshot[], index: number) {
  if (!sectors.length) return undefined
  return sectors[index % Math.min(5, sectors.length)]
}

export function deriveHistoricalReplay(
  narrative: NarrativeSurface,
  sectors: SectorRotationSnapshot[] = narrative.sourceSectors ?? [],
  window: HistoricalReplayWindow = "90D"
): HistoricalReplaySurface {
  const count = frameCount(window)
  const heatLeaders = narrative.heatmap.length ? narrative.heatmap : []

  // NarrativeSurface uses `storyTimeline`; older experimental builds used `lifecycle`.
  // Keep the replay engine aligned with the current canonical type.
  const storyTimeline = narrative.storyTimeline.length ? narrative.storyTimeline : []
  const notes: string[] = []

  if (!heatLeaders.length) notes.push("No narrative heatmap data available for replay.")
  if (!storyTimeline.length) notes.push("No story timeline data available for replay.")
  if (!sectors.length) notes.push("No sector rotation data available for replay.")

  const frames = Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 1 : index / (count - 1)
    const leader = pickLeader(sectors, index)
    const story = pickStory(storyTimeline, index)
    const heat = heatLeaders[index % Math.max(1, heatLeaders.length)]
    const baseScore = leader?.rotationScore ?? heat?.heat ?? 0
    const intensity = clamp(baseScore * (0.72 + progress * 0.28), 0, 100)
    const phase = phaseFromProgress(progress)
    const temperature = clamp(
      intensity * 0.52 +
        (heat?.heat ?? 0) * 0.28 +
        (leader?.breadth ?? 0) * 0.2,
      0,
      100
    )

    return {
      id: `historical-${window}-${index}`,
      index,
      label: `T-${count - index}`,
      phase,
      regime: narrative.regime,
      leader: leader?.sector ?? heat?.narrative ?? "Market",
      direction: leader?.direction ?? heat?.direction ?? "MIXED",
      intensity,
      narrative: story?.title ?? heat?.summary ?? narrative.marketSummary,
      detail: story?.detail ?? narrative.marketSummary,
      alertCount: intensity >= 75 ? 2 : intensity >= 55 ? 1 : 0,
      temperature,
    }
  })

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    window,
    frames,
    notes,
  }
}
