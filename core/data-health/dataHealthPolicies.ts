import type { StandardArtifactType } from "@/core/artifact-standardization"

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

export const DATA_FRESHNESS_POLICIES: Readonly<
  Partial<Record<StandardArtifactType, number>>
> = {
  funding: 15 * MINUTE,
  open_interest: 15 * MINUTE,
  market_driver: 15 * MINUTE,
  liquidation: 30 * MINUTE,
  etf: 24 * HOUR,
  exchange_flow: HOUR,
  treasury: 24 * HOUR,
  coverage_index: 15 * MINUTE,
}

export function dataFreshnessPolicy(artifactType: string) {
  return DATA_FRESHNESS_POLICIES[
    artifactType as StandardArtifactType
  ] ?? null
}
