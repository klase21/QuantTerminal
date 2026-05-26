export interface ReplayEvent {
  timestamp: string
  event: string
  severity: "LOW" | "MEDIUM" | "HIGH"
}

export const replayTimeline: ReplayEvent[] = [
  {
    timestamp: "45m ago",
    event: "MEME → AI rotation started",
    severity: "HIGH",
  },
  {
    timestamp: "12m ago",
    event: "Whale inflow confirmed",
    severity: "HIGH",
  },
]