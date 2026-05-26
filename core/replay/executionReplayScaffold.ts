export interface ReplayEvent {
  id: string
  time: string
  title: string
  explanation: string
}

export function buildReplayEvents() : ReplayEvent[] {
  return [
    {
      id: "replay-1",
      time: "14:02",
      title: "Perp breakout failed",
      explanation:
        "Futures aggression expanded but spot confirmation remained weak.",
    },
    {
      id: "replay-2",
      time: "14:18",
      title: "Absorption detected",
      explanation:
        "Spot absorbed downside sell pressure near local liquidity zone.",
    },
    {
      id: "replay-3",
      time: "14:31",
      title: "Continuation regained",
      explanation:
        "Macro pressure eased while ETH/BTC stabilized.",
    },
  ]
}
