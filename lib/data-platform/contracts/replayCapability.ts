export type ReplayGranularity =
  | "EVENT" | "TICK" | "ONE_MINUTE" | "FIVE_MINUTE"
  | "EIGHT_HOUR_EVENT" | "SNAPSHOT" | "DOCUMENT" | "NOT_APPLICABLE"

export interface ReplayCapability {
  supported: boolean
  granularity: ReplayGranularity
  boundedQuerySupport: boolean
  sequenceSupport: boolean
  snapshotSupport: boolean
  rawRehydrationRequired: boolean
  limitations: readonly string[]
}

export function validateReplayCapability(value: ReplayCapability): boolean {
  return value.supported || (value.granularity === "NOT_APPLICABLE" && !value.boundedQuerySupport)
}
