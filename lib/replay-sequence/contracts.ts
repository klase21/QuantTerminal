export type ReplaySequenceState = "AVAILABLE" | "READ_ERROR" | "PROJECTION_MISMATCH"

export interface ReplayPoint {
  readonly eventTime: string
  readonly value: number
  readonly sourceChecksum: string
}

export interface ReplayPricePoint extends ReplayPoint {
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
  readonly volume: number
}

export interface ReplayFundingMarker extends ReplayPoint {
  readonly providerId: string
}

export interface ReplayFlowBucket {
  readonly bucketId: string
  readonly eventTime: string
  readonly bucketEnd: string
  readonly aggressiveBuyQuantity: string
  readonly aggressiveSellQuantity: string
  readonly imbalanceRatio: number | null
  readonly tradeCount: number
}

export interface ReplaySequenceStep {
  readonly sequence: number
  readonly eventTime: string
  readonly code: string
  readonly relationship: "SUPPORTS" | "OPPOSES" | "NEUTRAL"
  readonly statement: string
  readonly measuredValue: number | null
  readonly unit: string | null
}

export interface ReplaySequenceModel {
  readonly status: "AVAILABLE"
  readonly modelVersion: "mvp-replay-sequence/1.0.0"
  readonly modelChecksum: string
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly sourceProjectionVersionId: string
  readonly sourceProjectionChecksum: string
  readonly marketState: string
  readonly evidencePacketId: string
  readonly price: readonly ReplayPricePoint[]
  readonly openInterest: readonly ReplayPoint[]
  readonly funding: readonly ReplayFundingMarker[]
  readonly flow: readonly ReplayFlowBucket[]
  readonly sequence: readonly ReplaySequenceStep[]
  readonly sampleCounts: Readonly<Record<"price" | "openInterest" | "funding" | "flow", number>>
  readonly limitations: readonly string[]
}
