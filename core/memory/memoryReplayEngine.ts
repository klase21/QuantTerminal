import { clamp, round } from "@/core/shared/metrics"
import type { HistoricalRegimeSnapshot } from "./historicalMemoryTypes"

export type MemoryReplayWindow = "30D" | "90D" | "180D" | "ALL"

export interface MemoryReplayFrame {
  id: string
  index: number
  progress: number
  timestamp: string
  regime: string
  leadNarrative: string
  leadSector: string
  leadPhase: string
  heat: number
  stress: number
  reflexivity: number
  instability: number
  crowding: number
  liquidityQuality: number
  transitionFrom?: string
  operatorRead: string
}

export interface MemoryTransitionFrame {
  id: string
  from: string
  to: string
  timestamp: string
  stressDelta: number
  heatDelta: number
  operatorRead: string
}

export interface MemoryQualitySurface {
  snapshotCount: number
  replayableCount: number
  coverageDays: number
  lastSaved?: string
  stale: boolean
  replayable: boolean
  operatorRead: string
}

export interface MemoryCaseStudy {
  title: string
  subtitle: string
  start?: string
  end?: string
  durationFrames: number
  averageHeat: number
  averageStress: number
  operatorRead: string
}

export interface MemoryReplaySurface {
  window: MemoryReplayWindow
  frames: MemoryReplayFrame[]
  currentFrame?: MemoryReplayFrame
  transitions: MemoryTransitionFrame[]
  quality: MemoryQualitySurface
  caseStudy?: MemoryCaseStudy
  operatorRead: string
}

const DAY_MS = 86_400_000

function timeOf(value?: string) {
  const time = value ? new Date(value).getTime() : NaN
  return Number.isFinite(time) ? time : 0
}

function dedupeSnapshots(snapshots: HistoricalRegimeSnapshot[]) {
  const map = new Map<string, HistoricalRegimeSnapshot>()
  snapshots.forEach((snapshot) => {
    if (!snapshot?.timestamp) return
    const key = snapshot.id || `${snapshot.timestamp}-${snapshot.regime}-${snapshot.leadNarrative}`
    map.set(key, snapshot)
  })
  return Array.from(map.values()).sort((a, b) => timeOf(a.timestamp) - timeOf(b.timestamp))
}

function windowDays(window: MemoryReplayWindow) {
  switch (window) {
    case "30D":
      return 30
    case "90D":
      return 90
    case "180D":
      return 180
    default:
      return Number.POSITIVE_INFINITY
  }
}

function filterByWindow(snapshots: HistoricalRegimeSnapshot[], window: MemoryReplayWindow) {
  const sorted = dedupeSnapshots(snapshots)
  if (window === "ALL" || !sorted.length) return sorted
  const cutoff = timeOf(sorted.at(-1)?.timestamp) - windowDays(window) * DAY_MS
  return sorted.filter((snapshot) => timeOf(snapshot.timestamp) >= cutoff)
}

function average(values: number[]) {
  const valid = values.filter(Number.isFinite)
  if (!valid.length) return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function buildQuality(allSnapshots: HistoricalRegimeSnapshot[], frames: MemoryReplayFrame[]): MemoryQualitySurface {
  const sorted = dedupeSnapshots(allSnapshots)
  const first = timeOf(sorted[0]?.timestamp)
  const last = timeOf(sorted.at(-1)?.timestamp)
  const coverageDays = first && last ? Math.max(0, Math.round((last - first) / DAY_MS)) : 0
  const stale = last ? Date.now() - last > 10 * 60_000 : true
  const replayable = frames.length >= 3
  const operatorRead = replayable
    ? `Memory contains ${frames.length} replayable frames across ${coverageDays} day${coverageDays === 1 ? "" : "s"}.`
    : "Memory replay is warming up. More snapshots are needed before transition playback is useful."

  return {
    snapshotCount: sorted.length,
    replayableCount: frames.length,
    coverageDays,
    lastSaved: sorted.at(-1)?.timestamp,
    stale,
    replayable,
    operatorRead,
  }
}

function buildFrames(snapshots: HistoricalRegimeSnapshot[]): MemoryReplayFrame[] {
  const total = Math.max(1, snapshots.length - 1)
  return snapshots.map((snapshot, index) => {
    const prior = snapshots[index - 1]
    const transitionFrom = prior && prior.regime !== snapshot.regime ? prior.regime : undefined
    const operatorRead = transitionFrom
      ? `${transitionFrom.replaceAll("_", " ")} transitioned into ${snapshot.regime.replaceAll("_", " ")} with ${snapshot.leadNarrative} leading the tape.`
      : `${snapshot.leadNarrative} held the lead while ${snapshot.regime.replaceAll("_", " ")} remained active.`

    return {
      id: snapshot.id,
      index,
      progress: round((index / total) * 100, 2),
      timestamp: snapshot.timestamp,
      regime: snapshot.regime,
      leadNarrative: snapshot.leadNarrative,
      leadSector: snapshot.leadSector,
      leadPhase: snapshot.leadPhase,
      heat: snapshot.heat,
      stress: snapshot.stress,
      reflexivity: snapshot.reflexivity,
      instability: snapshot.instability,
      crowding: snapshot.crowding,
      liquidityQuality: snapshot.liquidityQuality,
      transitionFrom,
      operatorRead,
    }
  })
}

function buildTransitions(frames: MemoryReplayFrame[]): MemoryTransitionFrame[] {
  const transitions: MemoryTransitionFrame[] = []
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]
    const current = frames[index]
    if (!previous || !current || previous.regime === current.regime) continue
    const stressDelta = round(current.stress - previous.stress, 2)
    const heatDelta = round(current.heat - previous.heat, 2)
    transitions.push({
      id: `${previous.id}-${current.id}`,
      from: previous.regime,
      to: current.regime,
      timestamp: current.timestamp,
      stressDelta,
      heatDelta,
      operatorRead: `${previous.regime.replaceAll("_", " ")} shifted into ${current.regime.replaceAll("_", " ")}; heat ${heatDelta >= 0 ? "+" : ""}${heatDelta}, stress ${stressDelta >= 0 ? "+" : ""}${stressDelta}.`,
    })
  }
  return transitions.slice(-8).reverse()
}

function buildCaseStudy(frames: MemoryReplayFrame[]): MemoryCaseStudy | undefined {
  if (frames.length < 3) return undefined
  const bestStart = frames.reduce((best, frame, index) => {
    const window = frames.slice(index, index + 5)
    const score = average(window.map((item) => item.heat * 0.55 + item.reflexivity * 0.25 + item.stress * 0.2))
    return score > best.score ? { index, score } : best
  }, { index: 0, score: -1 })

  const segment = frames.slice(bestStart.index, bestStart.index + 5)
  const lead = segment[0]
  const tail = segment.at(-1)
  if (!lead) return undefined

  const averageHeat = round(average(segment.map((frame) => frame.heat)), 2)
  const averageStress = round(average(segment.map((frame) => frame.stress)), 2)
  const title = `${lead.leadNarrative} Memory Case`
  const subtitle = `${lead.regime.replaceAll("_", " ")} / ${lead.leadPhase.replaceAll("_", " ")}`
  const operatorRead = averageStress > 65
    ? `${lead.leadNarrative} replay segment shows elevated stress; treat similar current regimes as fragile.`
    : averageHeat > 70
      ? `${lead.leadNarrative} replay segment shows sustained heat with manageable stress.`
      : `${lead.leadNarrative} replay segment is moderate; use as context rather than a strong analog.`

  return {
    title,
    subtitle,
    start: lead.timestamp,
    end: tail?.timestamp,
    durationFrames: segment.length,
    averageHeat,
    averageStress,
    operatorRead,
  }
}

export function buildMemoryReplaySurface(
  snapshots: HistoricalRegimeSnapshot[],
  window: MemoryReplayWindow,
  frameIndex = 0
): MemoryReplaySurface {
  const scoped = filterByWindow(snapshots, window)
  const frames = buildFrames(scoped)
  const safeIndex = frames.length ? Math.min(frames.length - 1, Math.max(0, frameIndex)) : 0
  const currentFrame = frames[safeIndex]
  const transitions = buildTransitions(frames)
  const quality = buildQuality(snapshots, frames)
  const caseStudy = buildCaseStudy(frames)
  const operatorRead = currentFrame
    ? `Replay frame ${safeIndex + 1}/${frames.length}: ${currentFrame.leadNarrative} is leading under ${currentFrame.regime.replaceAll("_", " ")}.`
    : "No replay frame available yet. Memory will populate as live snapshots accumulate."

  return {
    window,
    frames,
    currentFrame,
    transitions,
    quality,
    caseStudy,
    operatorRead,
  }
}

export function exportHistoricalMemory(snapshots: HistoricalRegimeSnapshot[]) {
  return JSON.stringify({
    schema: "quantterminal.historical-memory.v1",
    exportedAt: new Date().toISOString(),
    snapshots: dedupeSnapshots(snapshots),
  }, null, 2)
}

export function importHistoricalMemory(raw: string): HistoricalRegimeSnapshot[] {
  const parsed = JSON.parse(raw) as { snapshots?: HistoricalRegimeSnapshot[] } | HistoricalRegimeSnapshot[]
  const snapshots = Array.isArray(parsed) ? parsed : parsed.snapshots
  if (!Array.isArray(snapshots)) return []
  return dedupeSnapshots(
    snapshots.filter((snapshot) => snapshot && typeof snapshot.timestamp === "string" && typeof snapshot.regime === "string")
  )
}
