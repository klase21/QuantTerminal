export interface ThreatSignal {
  threat: string
  severity: number
}

export function buildThreats(): ThreatSignal[] {
  return [
    {
      threat: "ETH/BTC weakness",
      severity: 82,
    },
    {
      threat: "OI overheating",
      severity: 74,
    },
  ]
}