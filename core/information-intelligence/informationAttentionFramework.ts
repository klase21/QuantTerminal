export type AttentionVelocityWindow = "5m" | "15m" | "1h" | "4h" | "24h"

export interface InformationAttentionSnapshot {
  itemId: string
  observedAt: string
  velocityWindow: AttentionVelocityWindow
  velocity: number
  mentions: number
  spread: number
  crossPlatformPresence: number
  sourceCount: number
  topPlatforms: string[]
}

export interface InformationAttentionContract {
  itemId: string
  requiredFutureSignals: [
    "mention count",
    "engagement count",
    "velocity over time window",
    "source/platform count",
    "cross-platform duplication or spread",
  ]
  interpretationRule: string
}

export const attentionFrameworkPrinciples = [
  "Velocity measures acceleration, not absolute popularity.",
  "Mentions measure volume of discussion.",
  "Spread measures how far the item travels beyond the origin platform.",
  "Cross-platform presence is stronger than isolated virality.",
  "Attention alone does not imply reliability or market impact.",
] as const

