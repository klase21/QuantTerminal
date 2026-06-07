import type { MockReplaySourceCase } from "./mockReplayData"
import type {
  ReplayAgentSummary,
  ReplayCase,
  ReplayDirection,
  ReplayEvent,
  ReplayFrame,
  ReplayMarketSnapshot,
} from "./replayTypes"

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function directionFromChange(changePct: number): ReplayDirection {
  if (changePct > 0.15) return "UP"
  if (changePct < -0.15) return "DOWN"
  return "SIDEWAYS"
}

function eventSourceFromTitle(title: string): ReplayEvent["source"] {
  const normalized = title.toLowerCase()
  if (normalized.includes("oi") || normalized.includes("funding") || normalized.includes("perp")) return "derivatives"
  if (normalized.includes("headline") || normalized.includes("narrative")) return "news"
  if (normalized.includes("break") || normalized.includes("support") || normalized.includes("continuation")) return "price"
  return "manual"
}

function buildMarketSnapshot(
  source: MockReplaySourceCase,
  index: number,
): ReplayMarketSnapshot {
  const point = source.pricePath[index] ?? source.pricePath[0]
  const previous = source.pricePath[Math.max(0, index - 1)] ?? point
  const price = point?.price ?? 0
  const prevPrice = previous?.price || price || 1
  const priceChangePct = ((price - prevPrice) / prevPrice) * 100

  return {
    symbol: source.symbol,
    price,
    priceChangePct,
    direction: directionFromChange(priceChangePct),
    volumeRead: point?.volume ? `${point.volume.toLocaleString()} mock contracts` : "Mock volume unavailable",
    fundingRate: source.derivatives.fundingRate,
    openInterestChangePct: source.derivatives.openInterestChange,
    openInterestNotional: source.derivatives.oiNotional,
    liquidityRead: source.derivatives.crowdingRead,
  }
}

function buildFrameAgents(source: MockReplaySourceCase, index: number): ReplayAgentSummary[] {
  const progress = source.pricePath.length <= 1 ? 1 : index / (source.pricePath.length - 1)

  return source.agents.map((agent) => ({
    ...agent,
    confidence: clamp(Math.round(agent.confidence * (0.92 + progress * 0.08))),
  }))
}

export function adaptMockReplayCase(source: MockReplaySourceCase): ReplayCase {
  const events: ReplayEvent[] = source.events.map((event) => ({
    id: event.id,
    timestamp: event.time,
    title: event.title,
    severity: event.severity,
    description: event.description,
    source: eventSourceFromTitle(event.title),
  }))

  const frames: ReplayFrame[] = source.pricePath.map((point, index) => {
    const eventIds =
      index === 0
        ? [events[0]?.id].filter(Boolean)
        : events
            .filter((_, eventIndex) => {
              const frameBucket = Math.floor((index / Math.max(1, source.pricePath.length - 1)) * events.length)
              return eventIndex === Math.min(events.length - 1, frameBucket)
            })
            .map((event) => event.id)

    return {
      id: `${source.id}-frame-${index}`,
      index,
      timestamp: point.label,
      label: point.label,
      eventIds,
      market: buildMarketSnapshot(source, index),
      expectation: {
        label: source.predictionExpectation.market,
        probability: source.predictionExpectation.expectedProbability,
        source: "mock-prediction-market",
        status: "mock",
        interpretation: `${source.predictionExpectation.actualResolution}. ${source.predictionExpectation.note}`,
      },
      narrative: {
        primaryNarrative: source.primaryNarrative,
        summary: source.narrativeSummary,
        items: source.news.map((item) => ({
          timestamp: item.time,
          source: item.source,
          headline: item.headline,
          sentiment: item.sentiment,
          narrative: item.narrative,
        })),
        possibleDrivers: source.possibleDrivers.map((driver, driverIndex) => ({
          ...driver,
          rank: driverIndex + 1,
        })),
      },
      risk: source.risk,
      agents: buildFrameAgents(source, index),
    }
  })

  return {
    id: source.id,
    title: source.title,
    symbol: source.symbol,
    window: source.window,
    setup: source.setup,
    outcome: source.outcome,
    verdict: source.verdict,
    verdictSummary: source.verdictSummary,
    realityCheck: source.realityCheck,
    events,
    frames,
  }
}

export function adaptMockReplayCases(sources: MockReplaySourceCase[]): ReplayCase[] {
  return sources.map(adaptMockReplayCase)
}
