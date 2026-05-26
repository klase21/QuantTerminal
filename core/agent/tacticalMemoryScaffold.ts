export interface TacticalMemoryEvent {
  id: string
  type:
    | "FAKE_BREAKOUT"
    | "CONTINUATION_FAILURE"
    | "ABSORPTION"
    | "RISK_OFF_SHIFT"
  title: string
  age: string
  severity: number
}

export function buildTacticalMemoryScaffold(): TacticalMemoryEvent[] {
  return [
    {
      id: "fake-breakout-1",
      type: "FAKE_BREAKOUT",
      title: "Perp-led breakout faded after spot failed to confirm",
      age: "42m ago",
      severity: 74,
    },
    {
      id: "absorption-1",
      type: "ABSORPTION",
      title: "Spot absorbed futures sell pressure near local low",
      age: "28m ago",
      severity: 68,
    },
    {
      id: "continuation-failure-1",
      type: "CONTINUATION_FAILURE",
      title: "RWA continuation failed after liquidity sweep",
      age: "16m ago",
      severity: 61,
    },
  ]
}
