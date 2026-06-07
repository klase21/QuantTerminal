export interface RegionalNarrative {
  region: string
  narrative: string
  bias: "BULLISH" | "BEARISH" | "NEUTRAL"
}

export const regionalNarratives: RegionalNarrative[] = [
  {
    region: "KR",
    narrative: "AI momentum strengthening",
    bias: "BULLISH",
  },
  {
    region: "CN",
    narrative: "RWA capital rotation increasing",
    bias: "BULLISH",
  },
  {
    region: "EN",
    narrative: "Defensive positioning remains",
    bias: "NEUTRAL",
  },
]