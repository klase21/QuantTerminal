export interface ReplayEvent {
  id: string
  time: string
  title: string
  explanation: string
}

function nowLabel(offsetMinutes: number) {
  const date = new Date(Date.now() - offsetMinutes * 60_000)
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}

export function buildReplayEvents({
  fakeBreakoutRisk = 0,
  absorptionScore = 0,
  realDemandConfirmation = 0,
}: {
  fakeBreakoutRisk?: number
  absorptionScore?: number
  realDemandConfirmation?: number
} = {}): ReplayEvent[] {
  const events: ReplayEvent[] = []

  if (fakeBreakoutRisk >= 55) {
    events.push({
      id: "fake-breakout-live",
      time: nowLabel(8),
      title: "Perp-led breakout risk increased",
      explanation: "Futures aggression expanded faster than spot confirmation.",
    })
  }

  if (absorptionScore >= 50) {
    events.push({
      id: "absorption-live",
      time: nowLabel(5),
      title: "Absorption signature detected",
      explanation: "Spot appears to absorb futures selling pressure.",
    })
  }

  if (realDemandConfirmation >= 60) {
    events.push({
      id: "demand-live",
      time: nowLabel(2),
      title: "Real demand confirmation improved",
      explanation: "Spot/futures alignment improved continuation quality.",
    })
  }

  if (!events.length) {
    events.push({
      id: "mixed-live",
      time: nowLabel(3),
      title: "Mixed tactical state",
      explanation: "No dominant replay event is active yet.",
    })
  }

  return events
}
