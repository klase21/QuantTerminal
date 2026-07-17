import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { CanonicalPersistenceAdapter, IsolatedPostgresClient, PolicyVersionInput, ProviderSnapshotInput, RegistrySnapshotInput } from "@/lib/data-platform/persistence/postgres"
import { AGG_TRADES_SEGMENT_NORMALIZER_VERSION, AGG_TRADES_SEGMENT_ORDER_POLICY, AGG_TRADES_SEGMENT_SCHEMA_VERSION, OPEN_INTEREST_FROZEN_CUTOFF, PRODUCTION_NORMALIZER_VERSION } from "@/lib/data-platform/population/backfill"
import { BOUNDED_FUNDING_PARSER_VERSION, BOUNDED_FUNDING_PROVIDER, BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION } from "./boundedFunding"
import type { RefreshLogicalDataset } from "./unitReconciliation"

export type IntegratedGovernanceState = "READY" | "MISSING" | "CHECKSUM_CONFLICT" | "VERSION_MISMATCH" | "NOT_REQUIRED"

export interface LiveDatasetGovernanceBinding {
  readonly datasetRegistry: string
  readonly providerRegistry: string
  readonly certification: string
  readonly policy: string
  readonly providerId: string
  readonly parser: string
  readonly schema: string
}

export const LIVE_MVP_DATASET_GOVERNANCE: Readonly<Record<RefreshLogicalDataset, LiveDatasetGovernanceBinding>> = Object.freeze({
  ohlcv: Object.freeze({ datasetRegistry: "d3-phase3-dataset-registry-v1", providerRegistry: "d3-phase3-binance-archive-provider-v1", certification: "d3-phase3-binance-archive-ohlcv-certification-v1", policy: "d3-phase3-ohlcv-canary-policy-v1", providerId: "binance-public-archive", parser: "binance-vision-ohlcv-csv-v1", schema: "1" }),
  "open-interest": Object.freeze({ datasetRegistry: "d3-phase3-open-interest-dataset-registry-v1", providerRegistry: "d3-phase3-binance-vision-open-interest-provider-v1", certification: "d3-phase3-binance-vision-open-interest-certification-v1", policy: "d3-phase3-open-interest-policy-v1", providerId: "binance-vision", parser: "binance-vision-open-interest-csv-v1", schema: "1" }),
  funding: Object.freeze({ datasetRegistry: "d3-phase3-funding-dataset-registry-v1", providerRegistry: `mvp-bounded-funding-provider:${BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION}`, certification: "mvp-bounded-funding-certification-v1", policy: "mvp-bounded-funding-policy-v1", providerId: BOUNDED_FUNDING_PROVIDER, parser: BOUNDED_FUNDING_PARSER_VERSION, schema: "1.0.0" }),
  "agg-trade": Object.freeze({ datasetRegistry: "d3-phase3-agg-trade-segment-dataset-v2", providerRegistry: "d3-phase3-binance-vision-agg-trade-provider-v1", certification: "d3-phase3-binance-vision-agg-trade-segment-certification-v2", policy: "d3-phase3-agg-trade-segment-policy-v2", providerId: "binance-public-archive", parser: "binance-vision-agg-trades-segment-v2", schema: AGG_TRADES_SEGMENT_SCHEMA_VERSION }),
})

type GovernanceInput =
  | { readonly kind: "REGISTRY"; readonly dataset: RefreshLogicalDataset; readonly identity: string; readonly input: RegistrySnapshotInput }
  | { readonly kind: "PROVIDER"; readonly dataset: RefreshLogicalDataset; readonly identity: string; readonly input: ProviderSnapshotInput }
  | { readonly kind: "POLICY"; readonly dataset: RefreshLogicalDataset; readonly identity: string; readonly input: PolicyVersionInput }

const checksum = (value: Readonly<Record<string, string | number | boolean | null>>) => canonicalChecksum(value)

function registry(dataset: RefreshLogicalDataset, input: Omit<RegistrySnapshotInput, "contentChecksum">, checksumBasis: Readonly<Record<string, string | number | boolean | null>>): GovernanceInput {
  return Object.freeze({ kind: "REGISTRY", dataset, identity: input.snapshotId, input: Object.freeze({ ...input, contentChecksum: checksum(checksumBasis) }) })
}

function provider(dataset: RefreshLogicalDataset, input: Omit<ProviderSnapshotInput, "contentChecksum">, checksumBasis: Readonly<Record<string, string | number | boolean | null>>): GovernanceInput {
  return Object.freeze({ kind: "PROVIDER", dataset, identity: input.snapshotId, input: Object.freeze({ ...input, contentChecksum: checksum(checksumBasis) }) })
}

function policy(dataset: RefreshLogicalDataset, input: Omit<PolicyVersionInput, "contentChecksum">, checksumBasis: Readonly<Record<string, string | number | boolean | null>>): GovernanceInput {
  return Object.freeze({ kind: "POLICY", dataset, identity: input.policyVersionId, input: Object.freeze({ ...input, contentChecksum: checksum(checksumBasis) }) })
}

export function integratedMvpGovernanceDefinitions(effectiveAt: string): readonly GovernanceInput[] {
  const ohlcvRegistry = { datasetId: "ohlcv", schemaVersion: "1" }
  const ohlcvProvider = { providerId: "binance-public-archive", scope: "BINANCE_VISION_OHLCV_ARCHIVE" }
  const ohlcvCertification = { providerId: "binance-public-archive", certification: "OHLCV_CANARY" }
  const ohlcvPolicy = { datasetId: "ohlcv", source: "binance-public-archive", resolution: "5m", normalizationVersion: PRODUCTION_NORMALIZER_VERSION }
  const oiRegistry = { datasetId: "open-interest", cadence: "5m", fields: "instrument,market,quantity,quantityUnit,notionalValue,valueUnit,observationTime" }
  const oiProvider = { providerId: "binance-vision", scope: "USD_M_FUTURES_DAILY_METRICS_OPEN_INTEREST" }
  const oiCertification = { providerId: "binance-vision", certification: "OPEN_INTEREST_THROUGH_2026_07_11" }
  const oiPolicy = { source: "BINANCE_VISION_DAILY_METRICS_ONLY", cadence: "5m", duplicates: "REJECT_EXACT_DUPLICATE_SOURCE_OBSERVATIONS", cutoff: OPEN_INTEREST_FROZEN_CUTOFF, normalizationVersion: PRODUCTION_NORMALIZER_VERSION }
  const fundingRegistry = { datasetId: "funding", cadence: "EVENT_8H", canonicalFields: "instrument,market,eventTime,rate,interval" }
  const fundingProvider = { providerId: BOUNDED_FUNDING_PROVIDER, sourceContractVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, endpointClass: "BINANCE_FAPI_FUNDING_RATE", eventSemantics: "PROVIDER_NATIVE_DISCRETE" }
  const fundingCertification = { providerId: BOUNDED_FUNDING_PROVIDER, certification: "BOUNDED_PROVIDER_NATIVE_FUNDING", sourceContractVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, limitation: "NO_INTERPOLATION_NO_FORWARD_FILL" }
  const fundingPolicy = { datasetId: "funding", source: "BINANCE_OFFICIAL_REST_FUNDING_RATE", maximumInterval: "P1D", interpolation: false, forwardFill: false, normalizationVersion: PRODUCTION_NORMALIZER_VERSION }
  const aggRegistry = { datasetId: "agg-trade", representation: "canonical-stream-segment" }
  const aggProvider = { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES" }
  const aggCertification = { representation: "PARQUET_SNAPPY", cutoff: "2026-07-12T00:00:00.000Z" }
  const aggPolicy = { source: "BINANCE_VISION_USDM_DAILY_AGGTRADES", target: "CANONICAL_STREAM_SEGMENT", order: AGG_TRADES_SEGMENT_ORDER_POLICY }
  return Object.freeze([
    registry("ohlcv", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.ohlcv.datasetRegistry, registryVersion: "1.0.0", canonicalContent: { ...ohlcvRegistry, purpose: "D3_PHASE3_CANARY" }, effectiveAt, createdAt: effectiveAt }, ohlcvRegistry),
    provider("ohlcv", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.ohlcv.providerRegistry, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: { ...ohlcvProvider, limitation: "OHLCV_ONLY" }, effectiveAt, createdAt: effectiveAt }, ohlcvProvider),
    provider("ohlcv", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.ohlcv.certification, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: { ...ohlcvCertification, limitation: "ONE_PARTITION" }, effectiveAt, createdAt: effectiveAt }, ohlcvCertification),
    policy("ohlcv", { policyVersionId: LIVE_MVP_DATASET_GOVERNANCE.ohlcv.policy, datasetId: "ohlcv", policyVersion: "1.0.0", canonicalContent: ohlcvPolicy, effectiveAt, createdAt: effectiveAt }, ohlcvPolicy),
    registry("open-interest", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["open-interest"].datasetRegistry, registryVersion: "1.0.0", canonicalContent: oiRegistry, effectiveAt, createdAt: effectiveAt }, oiRegistry),
    provider("open-interest", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["open-interest"].providerRegistry, providerId: "binance-vision", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: { ...oiProvider, limitation: "FROZEN_ARCHIVE_ONLY" }, effectiveAt, createdAt: effectiveAt }, oiProvider),
    provider("open-interest", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["open-interest"].certification, providerId: "binance-vision", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: { ...oiCertification, limitation: "PROVIDER_NATIVE_UNITS" }, effectiveAt, createdAt: effectiveAt }, oiCertification),
    policy("open-interest", { policyVersionId: LIVE_MVP_DATASET_GOVERNANCE["open-interest"].policy, datasetId: "open-interest", policyVersion: "1.0.0", canonicalContent: oiPolicy, effectiveAt, createdAt: effectiveAt }, oiPolicy),
    registry("funding", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.funding.datasetRegistry, registryVersion: "1.0.0", canonicalContent: fundingRegistry, effectiveAt, createdAt: effectiveAt }, fundingRegistry),
    provider("funding", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.funding.providerRegistry, providerId: BOUNDED_FUNDING_PROVIDER, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: fundingProvider, effectiveAt, createdAt: effectiveAt }, fundingProvider),
    provider("funding", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE.funding.certification, providerId: BOUNDED_FUNDING_PROVIDER, registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: fundingCertification, effectiveAt, createdAt: effectiveAt }, fundingCertification),
    policy("funding", { policyVersionId: LIVE_MVP_DATASET_GOVERNANCE.funding.policy, datasetId: "funding", policyVersion: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION, canonicalContent: fundingPolicy, effectiveAt, createdAt: effectiveAt }, fundingPolicy),
    registry("agg-trade", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["agg-trade"].datasetRegistry, registryVersion: "2.0.0", canonicalContent: { ...aggRegistry, schema: AGG_TRADES_SEGMENT_SCHEMA_VERSION }, effectiveAt, createdAt: effectiveAt }, aggRegistry),
    provider("agg-trade", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["agg-trade"].providerRegistry, providerId: "binance-public-archive", registrationVersion: "1.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: aggProvider, effectiveAt, createdAt: effectiveAt }, aggProvider),
    provider("agg-trade", { snapshotId: LIVE_MVP_DATASET_GOVERNANCE["agg-trade"].certification, providerId: "binance-public-archive", registrationVersion: "2.0.0", certificationStatus: "CERTIFIED_WITH_LIMITATIONS", canonicalContent: aggCertification, effectiveAt, createdAt: effectiveAt }, aggCertification),
    policy("agg-trade", { policyVersionId: LIVE_MVP_DATASET_GOVERNANCE["agg-trade"].policy, datasetId: "agg-trade", policyVersion: "2.0.0", canonicalContent: aggPolicy, effectiveAt, createdAt: effectiveAt }, aggPolicy),
  ])
}

export interface IntegratedGovernanceInventoryEntry {
  readonly kind: GovernanceInput["kind"]
  readonly dataset: RefreshLogicalDataset
  readonly identity: string
  readonly expectedChecksum: string
  readonly state: IntegratedGovernanceState
}

async function readChecksum(client: IsolatedPostgresClient, definition: GovernanceInput): Promise<string | null> {
  if (definition.kind === "REGISTRY") {
    const rows = await client.sql<{ readonly content_checksum: string }[]>`SELECT content_checksum FROM control.registry_snapshots WHERE snapshot_id=${definition.identity}`
    return rows[0]?.content_checksum ?? null
  }
  if (definition.kind === "PROVIDER") {
    const rows = await client.sql<{ readonly content_checksum: string; readonly provider_id: string }[]>`SELECT content_checksum,provider_id FROM control.provider_snapshots WHERE snapshot_id=${definition.identity}`
    if (rows[0] && rows[0].provider_id !== definition.input.providerId) return "VERSION_MISMATCH"
    return rows[0]?.content_checksum ?? null
  }
  const rows = await client.sql<{ readonly content_checksum: string; readonly dataset_id: string }[]>`SELECT content_checksum,dataset_id FROM control.policy_versions WHERE policy_version_id=${definition.identity}`
  if (rows[0] && rows[0].dataset_id !== definition.input.datasetId) return "VERSION_MISMATCH"
  return rows[0]?.content_checksum ?? null
}

export async function inspectIntegratedMvpGovernancePrerequisites(client: IsolatedPostgresClient, effectiveAt: string): Promise<readonly IntegratedGovernanceInventoryEntry[]> {
  const definitions = integratedMvpGovernanceDefinitions(effectiveAt)
  return Object.freeze(await Promise.all(definitions.map(async (definition) => {
    const expectedChecksum = definition.input.contentChecksum
    const actual = await readChecksum(client, definition)
    const state: IntegratedGovernanceState = actual === null ? "MISSING" : actual === "VERSION_MISMATCH" ? "VERSION_MISMATCH" : actual === expectedChecksum ? "READY" : "CHECKSUM_CONFLICT"
    return Object.freeze({ kind: definition.kind, dataset: definition.dataset, identity: definition.identity, expectedChecksum, state })
  })))
}

export async function ensureIntegratedMvpGovernancePrerequisites(input: { readonly client: IsolatedPostgresClient; readonly adapter: CanonicalPersistenceAdapter; readonly effectiveAt: string }): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly entries: readonly IntegratedGovernanceInventoryEntry[] }> {
  const before = await inspectIntegratedMvpGovernancePrerequisites(input.client, input.effectiveAt)
  if (before.some((entry) => entry.state === "CHECKSUM_CONFLICT" || entry.state === "VERSION_MISMATCH")) throw new Error("INTEGRATED_GOVERNANCE_PREREQUISITE_CONFLICT")
  const missing = new Set(before.filter((entry) => entry.state === "MISSING").map((entry) => entry.identity))
  for (const definition of integratedMvpGovernanceDefinitions(input.effectiveAt)) {
    if (!missing.has(definition.identity)) continue
    const result = definition.kind === "REGISTRY" ? await input.adapter.registerRegistrySnapshot(definition.input) : definition.kind === "PROVIDER" ? await input.adapter.registerProviderSnapshot(definition.input) : await input.adapter.registerPolicyVersion(definition.input)
    if (result.status === "CONFLICT" || result.status === "REJECTED") throw new Error("INTEGRATED_GOVERNANCE_PREREQUISITE_CONFLICT")
  }
  const entries = await inspectIntegratedMvpGovernancePrerequisites(input.client, input.effectiveAt)
  if (entries.some((entry) => entry.state !== "READY")) throw new Error("INTEGRATED_GOVERNANCE_PREREQUISITE_INCOMPLETE")
  return Object.freeze({ status: missing.size ? "CREATED" : "DUPLICATE", entries })
}
