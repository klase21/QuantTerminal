import {
  LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
  liquidationEvidenceCacheIdentity,
  type LiquidationEvidence,
  type LiquidationEvidenceCacheMetadata,
  type LiquidationEvidenceCoordinates,
} from "./liquidationEvidenceTypes"
import { readHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"

export function readLiquidationEvidence(
  coordinates: LiquidationEvidenceCoordinates,
) {
  return readHistoricalCache<
    LiquidationEvidence,
    LiquidationEvidenceCacheMetadata
  >(
    liquidationEvidenceCacheIdentity(coordinates),
    {
      expectedSchemaVersion: LIQUIDATION_EVIDENCE_SCHEMA_VERSION,
      allowExpired: false,
      allowPartial: true,
    },
  )
}
