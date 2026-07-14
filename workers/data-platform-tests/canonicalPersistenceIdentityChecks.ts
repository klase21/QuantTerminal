import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { deriveCanonicalCommitId, deriveCanonicalRecordIdentity, type OhlcvFact, type OpenInterestFact } from "@/lib/data-platform/persistence"

const governance = { datasetRegistrySnapshotId: "dataset-snapshot-1", providerRegistrySnapshotId: "provider-snapshot-1", providerCertificationSnapshotId: "certification-snapshot-1", policyVersionId: "policy-1", schemaVersion: "1", normalizationVersion: "1" } as const
const placeholder = { datasetId: "pending", businessIdentity: "pending", canonicalRecordId: "pending" }
const ohlcvBase: OhlcvFact = { kind: "OHLCV", identity: placeholder, providerId: "provider-a", venue: "BINANCE", symbolOrSubject: "BTCUSDT", observedAt: "2026-07-12T00:00:00.000Z", effectiveAt: null, checksum: canonicalChecksum(["ohlcv"]), governance, resolution: "5m", open: "1", high: "2", low: "1", close: "2", volume: "10", closeTime: "2026-07-12T00:05:00.000Z" }
export const ohlcvIdentityA = deriveCanonicalRecordIdentity(ohlcvBase)
export const ohlcvIdentityB = deriveCanonicalRecordIdentity({ ...ohlcvBase, providerId: "provider-correction" })
const oiBase: OpenInterestFact = { kind: "OPEN_INTEREST", identity: placeholder, providerId: "provider-a", venue: "BINANCE", symbolOrSubject: "BTCUSDT", observedAt: "2026-07-12T00:00:00.000Z", effectiveAt: null, checksum: canonicalChecksum(["oi"]), governance, canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT", marketType: "USD_M_FUTURES", openInterest: "100", unit: "PROVIDER_NATIVE", openInterestValue: "1000", valueUnit: "PROVIDER_NATIVE_QUOTE_VALUE", window: "5m" }
export const oiIdentityA = deriveCanonicalRecordIdentity(oiBase)
export const oiIdentityB = deriveCanonicalRecordIdentity({ ...oiBase, providerId: "provider-b" })
export const commitIdA = deriveCanonicalCommitId({ idempotencyKey: "key", canonicalRecordId: ohlcvIdentityA.canonicalRecordId, recordVersion: 1, checksum: ohlcvBase.checksum })
export const commitIdB = deriveCanonicalCommitId({ idempotencyKey: "key", canonicalRecordId: ohlcvIdentityA.canonicalRecordId, recordVersion: 1, checksum: ohlcvBase.checksum })
