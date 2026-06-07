import type { FuturesIntelligenceResponse } from "@/core/futuresTypes"
import type { NarrativeSurface } from "@/core/narrative/narrativeTypes"
import { average, clamp, round } from "@/core/shared/metrics"
import type {
  HistoricalMemorySurface,
  HistoricalRegimeSnapshot,
  HistoricalSimilarityMatch,
  MemoryRegimeBias,
  NarrativePersistenceMemory,
  RegimeTransitionMemory,
} from "./historicalMemoryTypes"

const MAX_MATCHES = 5
const MIN_HISTORY_FOR_MEMORY = 4

function cleanDate(value?: string) {
  const time = value ? new Date(value).getTime() : NaN
  return Number.isFinite(time) ? new Date(time).toISOString() : new Date().toISOString()
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function scoreDistance(a: number, b: number, weight = 1) {
  return Math.abs(clamp(a) - clamp(b)) * weight
}

function labelList(values: string[]) {
  if (!values.length) return "market structure"
  if (values.length === 1) return values[0]
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`
}

export function buildHistoricalSnapshot(
  narrative: NarrativeSurface,
  futures?: FuturesIntelligenceResponse | null
): HistoricalRegimeSnapshot {
  const topHeat = narrative.heatmap[0]
  const topSector = narrative.sourceSectors[0]
  const topFuture = futures?.sectors?.[0]
  const leadPhase = narrative.propagation?.leadPhase ?? "DORMANT"
  const timestamp = cleanDate(narrative.generatedAt)

  return {
    id: `${timestamp}-${narrative.regime}-${topHeat?.narrative ?? "market"}`,
    timestamp,
    regime: narrative.regime,
    tone: narrative.tone,
    leadNarrative: topHeat?.narrative ?? narrative.propagation?.leadNarrative ?? "Market",
    leadSector: topSector?.sector ?? topHeat?.sectors?.[0] ?? "Market",
    leadPhase,
    heat: round(topHeat?.heat ?? narrative.propagation?.velocityScore ?? 0, 2),
    stress: round(narrative.liquidityStress?.stressScore ?? narrative.propagation?.stressScore ?? 0, 2),
    reflexivity: round(narrative.crossMarketReflexivity?.reflexivityScore ?? 0, 2),
    instability: round(narrative.crossMarketReflexivity?.instabilityScore ?? 0, 2),
    liquidityQuality: round(narrative.liquidityStress?.liquidityQuality ?? 0, 2),
    crowding: round(narrative.liquidityStress?.crowdingRisk ?? topFuture?.crowdingScore ?? 0, 2),
    futuresConviction: round(topFuture?.convictionScore ?? 0, 2),
    topSectors: uniq(narrative.sourceSectors.slice(0, 5).map((sector) => sector.sector)),
  }
}

function similarity(current: HistoricalRegimeSnapshot, prior: HistoricalRegimeSnapshot): HistoricalSimilarityMatch {
  const matchedOn: string[] = []
  let distance = 0

  if (current.regime === prior.regime) {
    matchedOn.push("regime")
  } else {
    distance += 14
  }

  if (current.tone === prior.tone) {
    matchedOn.push("tone")
  } else {
    distance += 8
  }

  if (current.leadNarrative === prior.leadNarrative || current.leadSector === prior.leadSector) {
    matchedOn.push("leader")
  } else {
    distance += 10
  }

  if (current.leadPhase === prior.leadPhase) {
    matchedOn.push("lifecycle")
  } else {
    distance += 7
  }

  const sharedSectors = current.topSectors.filter((sector) => prior.topSectors.includes(sector))
  if (sharedSectors.length) matchedOn.push(`${sharedSectors.length} shared sectors`)

  distance += scoreDistance(current.heat, prior.heat, 0.14)
  distance += scoreDistance(current.stress, prior.stress, 0.16)
  distance += scoreDistance(current.reflexivity, prior.reflexivity, 0.12)
  distance += scoreDistance(current.instability, prior.instability, 0.12)
  distance += scoreDistance(current.liquidityQuality, prior.liquidityQuality, 0.1)
  distance += scoreDistance(current.crowding, prior.crowding, 0.1)
  distance -= Math.min(12, sharedSectors.length * 3)

  const score = clamp(100 - distance)
  const operatorRead = score >= 78
    ? `Current structure closely rhymes with ${prior.leadNarrative} during ${prior.regime.replaceAll("_", " ")}.`
    : score >= 62
      ? `Partial historical rhyme detected around ${labelList(matchedOn)}.`
      : `Weak match; current tape is not strongly represented in local memory.`

  return {
    snapshot: prior,
    similarity: round(score, 2),
    matchedOn,
    operatorRead,
  }
}

function inferBias(sampleSize: number, best?: HistoricalSimilarityMatch): MemoryRegimeBias {
  if (sampleSize < MIN_HISTORY_FOR_MEMORY || !best) return "INSUFFICIENT_HISTORY"
  if (best.similarity >= 78) return "MATCH"
  if (best.similarity >= 60) return "RHYME"
  return "DIVERGENT"
}

function buildPersistence(history: HistoricalRegimeSnapshot[]): NarrativePersistenceMemory[] {
  const groups = new Map<string, HistoricalRegimeSnapshot[]>()
  history.forEach((snapshot) => {
    const key = snapshot.leadNarrative || snapshot.leadSector || "Market"
    groups.set(key, [...(groups.get(key) ?? []), snapshot])
  })

  return Array.from(groups.entries())
    .map(([narrative, snapshots]) => {
      const sorted = [...snapshots].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      const observations = sorted.length
      const heat = average(sorted.map((snapshot) => snapshot.heat))
      const stress = average(sorted.map((snapshot) => snapshot.stress))
      const persistenceScore = clamp(observations * 8 + heat * 0.45 - stress * 0.18)
      const operatorRead = persistenceScore >= 75
        ? `${narrative} has persistent narrative memory with repeated confirmation.`
        : persistenceScore >= 45
          ? `${narrative} is recurring but still tactical.`
          : `${narrative} appears episodic rather than persistent.`

      return {
        narrative,
        observations,
        persistenceScore: round(persistenceScore, 2),
        firstSeen: sorted[0]?.timestamp,
        lastSeen: sorted.at(-1)?.timestamp,
        operatorRead,
      }
    })
    .sort((a, b) => b.persistenceScore - a.persistenceScore)
    .slice(0, 6)
}

function buildTransitions(history: HistoricalRegimeSnapshot[]): RegimeTransitionMemory[] {
  const sorted = [...history].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const fromCounts = new Map<string, number>()
  const pairMap = new Map<string, { from: string; to: string; count: number; lastSeen?: string }>()

  for (let index = 1; index < sorted.length; index += 1) {
    const from = sorted[index - 1]?.regime ?? "MARKET_SCAN"
    const to = sorted[index]?.regime ?? "MARKET_SCAN"
    if (from === to) continue
    const key = `${from}->${to}`
    fromCounts.set(from, (fromCounts.get(from) ?? 0) + 1)
    const current = pairMap.get(key) ?? { from, to, count: 0 }
    current.count += 1
    current.lastSeen = sorted[index]?.timestamp
    pairMap.set(key, current)
  }

  return Array.from(pairMap.values())
    .map((transition) => {
      const probability = clamp((transition.count / Math.max(1, fromCounts.get(transition.from) ?? transition.count)) * 100)
      return {
        ...transition,
        probability: round(probability, 2),
        operatorRead: `${transition.from.replaceAll("_", " ")} has transitioned into ${transition.to.replaceAll("_", " ")} ${transition.count} time${transition.count === 1 ? "" : "s"} in local memory.`,
      }
    })
    .sort((a, b) => b.count - a.count || b.probability - a.probability)
    .slice(0, 6)
}

export function buildHistoricalMemorySurface(
  current: HistoricalRegimeSnapshot,
  history: HistoricalRegimeSnapshot[]
): HistoricalMemorySurface {
  const deduped = [...history]
    .filter((snapshot) => snapshot.id !== current.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const matches = deduped
    .map((snapshot) => similarity(current, snapshot))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, MAX_MATCHES)

  const bestMatch = matches[0]
  const bias = inferBias(deduped.length, bestMatch)
  const persistence = buildPersistence([current, ...deduped])
  const transitions = buildTransitions([current, ...deduped])
  const operatorRead = bias === "MATCH" && bestMatch
    ? `Historical memory detects a close regime match: ${bestMatch.snapshot.leadNarrative} / ${bestMatch.snapshot.regime.replaceAll("_", " ")} (${round(bestMatch.similarity, 0)} similarity).`
    : bias === "RHYME" && bestMatch
      ? `Market structure rhymes with prior ${bestMatch.snapshot.leadNarrative} conditions, but confirmation is incomplete.`
      : bias === "DIVERGENT"
        ? "Current structure is diverging from local memory; treat signals as regime discovery rather than replay."
        : "Historical memory is warming up. More live snapshots are required before similarity reads become reliable."

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sampleSize: deduped.length + 1,
    current,
    bias,
    bestMatch,
    matches,
    persistence,
    transitions,
    operatorRead,
    notes: [
      "Local browser memory only; no database persistence is required for this phase.",
      "Similarity is directional and intended for operator context, not prediction.",
    ],
  }
}

export function appendHistoricalSnapshot(
  history: HistoricalRegimeSnapshot[],
  snapshot: HistoricalRegimeSnapshot,
  maxSize = 240
) {
  const last = history.at(-1)
  const lastTime = last ? new Date(last.timestamp).getTime() : 0
  const nextTime = new Date(snapshot.timestamp).getTime()
  const duplicate = last &&
    last.regime === snapshot.regime &&
    last.leadNarrative === snapshot.leadNarrative &&
    Math.abs(nextTime - lastTime) < 60_000

  if (duplicate) return history

  return [...history, snapshot]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(-maxSize)
}
