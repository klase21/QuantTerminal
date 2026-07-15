import type postgres from "postgres"
import type { CanonicalFact } from "../contracts"
import { canonicalStreamSegmentV2Metadata, hasCanonicalStreamSegmentV2Metadata } from "../streamSegmentContracts"

const DECIMAL = /^-?\d+(?:\.\d+)?$/
const decimal = (value: string) => DECIMAL.test(value) && Number.isFinite(Number(value))
const providerDecimal = (value: string) => /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) && Number.isFinite(Number(value))
const timestamp = (value: string) => Number.isFinite(Date.parse(value))

export function validateTypedCanonicalFact(fact: CanonicalFact): readonly string[] {
  const errors: string[] = []
  if (!timestamp(fact.observedAt) || !fact.providerId || !fact.symbolOrSubject || !/^[a-f0-9]{64}$/.test(fact.checksum)) errors.push("INVALID_COMMON_FACT_FIELDS")
  if (fact.kind === "OHLCV") {
    if (!fact.venue || !timestamp(fact.closeTime) || Date.parse(fact.closeTime) <= Date.parse(fact.observedAt) || ![fact.open,fact.high,fact.low,fact.close,fact.volume].every(decimal) || Number(fact.high) < Number(fact.low) || Number(fact.volume) < 0) errors.push("INVALID_OHLCV_FACT")
  } else if (fact.kind === "FUNDING") {
    if (!fact.venue || !fact.canonicalInstrumentId || fact.marketType !== "USD_M_FUTURES" || !timestamp(fact.fundingTime) || !decimal(fact.fundingRate) || !Number.isInteger(fact.fundingIntervalHours) || fact.fundingIntervalHours <= 0) errors.push("INVALID_FUNDING_FACT")
  } else if (fact.kind === "OPEN_INTEREST") {
    if (!fact.venue || !fact.canonicalInstrumentId || fact.marketType !== "USD_M_FUTURES" || !decimal(fact.openInterest) || Number(fact.openInterest) < 0 || fact.unit !== "PROVIDER_NATIVE" || fact.window !== "5m" || (fact.openInterestValue === null) !== (fact.valueUnit === null) || (fact.openInterestValue !== null && (!decimal(fact.openInterestValue) || Number(fact.openInterestValue) < 0 || fact.valueUnit !== "PROVIDER_NATIVE_QUOTE_VALUE"))) errors.push("INVALID_OPEN_INTEREST_FACT")
  } else if (fact.kind === "AGG_TRADE") {
    if (!fact.venue || !fact.canonicalInstrumentId || fact.marketType !== "USD_M_FUTURES" || !/^\d+$/.test(fact.aggregateTradeId) || !/^\d+$/.test(fact.firstTradeId) || !/^\d+$/.test(fact.lastTradeId) || !/^\d+$/.test(fact.sourceTimestamp) || BigInt(fact.firstTradeId || "0") > BigInt(fact.lastTradeId || "0") || typeof fact.buyerIsMaker !== "boolean" || !timestamp(fact.tradeTime) || fact.tradeTime !== fact.observedAt || !providerDecimal(fact.price) || !providerDecimal(fact.quantity) || Number(fact.price) <= 0 || Number(fact.quantity) <= 0) errors.push("INVALID_AGG_TRADE_FACT")
  } else if (fact.kind === "LIQUIDATION") {
    if (!fact.venue || !fact.providerRecordId || !timestamp(fact.eventTime) || !decimal(fact.price) || !decimal(fact.quantity) || Number(fact.price) <= 0 || Number(fact.quantity) <= 0) errors.push("INVALID_LIQUIDATION_FACT")
  } else if (fact.kind === "PREDICTION_SNAPSHOT") {
    if (!fact.marketId || !fact.outcomeId || !decimal(fact.probability) || Number(fact.probability) < 0 || Number(fact.probability) > 1) errors.push("INVALID_PREDICTION_FACT")
  } else if (fact.kind === "ETF_OBSERVATION") {
    if (!fact.instrumentId || !decimal(fact.flowValue) || !timestamp(fact.windowStart) || !timestamp(fact.windowEnd) || Date.parse(fact.windowEnd) <= Date.parse(fact.windowStart)) errors.push("INVALID_ETF_FACT")
  } else if (fact.kind === "RESERVE_OBSERVATION") {
    if (!fact.venue || !fact.asset || !decimal(fact.balance) || Number(fact.balance) < 0) errors.push("INVALID_RESERVE_FACT")
  } else if (fact.kind === "MACRO_OBSERVATION") {
    if (!fact.seriesId || !fact.period || !["OFFICIAL_MACRO", "DAILY_MARKET_CONTEXT"].includes(fact.observationClass) || !decimal(fact.value)) errors.push("INVALID_MACRO_FACT")
  } else {
    const segmentV2 = canonicalStreamSegmentV2Metadata(fact)
    if (!fact.venue || !fact.rawObjectId || !timestamp(fact.windowStart) || !timestamp(fact.windowEnd) || Date.parse(fact.windowEnd) <= Date.parse(fact.windowStart) || (fact.recordCount !== null && (!Number.isInteger(fact.recordCount) || fact.recordCount < 0))) errors.push("INVALID_STREAM_MANIFEST_FACT")
    if (hasCanonicalStreamSegmentV2Metadata(fact) && (!segmentV2 || !/^cstream_[a-f0-9]{64}$/.test(segmentV2.canonicalStreamId) || !/^[a-f0-9]{64}$/.test(segmentV2.segmentContentChecksum) || !/^[a-f0-9]{64}$/.test(segmentV2.sourceRawObjectChecksum) || (segmentV2.sourceDatasetId === "agg-trade") !== (fact.streamKind === "AGG_TRADE") || (fact.recordCount! > 0 && (segmentV2.eventTimeMin === null || segmentV2.eventTimeMax === null || !timestamp(segmentV2.eventTimeMin) || !timestamp(segmentV2.eventTimeMax) || Date.parse(segmentV2.eventTimeMin) < Date.parse(fact.windowStart) || Date.parse(segmentV2.eventTimeMax) > Date.parse(fact.windowEnd) || Date.parse(segmentV2.eventTimeMax) < Date.parse(segmentV2.eventTimeMin))))) errors.push("INVALID_STREAM_SEGMENT_V2_METADATA")
  }
  return Object.freeze(errors)
}

export async function insertTypedCanonicalFact(sql: postgres.TransactionSql, fact: CanonicalFact, commitId: string, recordVersion: number): Promise<void> {
  const common = {
    factId: `${fact.identity.canonicalRecordId}:v${recordVersion}`,
    recordId: fact.identity.canonicalRecordId,
    businessId: fact.identity.businessIdentity,
    version: recordVersion,
    commitId,
    providerId: fact.providerId,
    registry: fact.governance.datasetRegistrySnapshotId,
    provider: fact.governance.providerRegistrySnapshotId,
    certification: fact.governance.providerCertificationSnapshotId,
    policy: fact.governance.policyVersionId,
    schema: fact.governance.schemaVersion,
    normalization: fact.governance.normalizationVersion,
    checksum: fact.checksum,
    observedAt: fact.observedAt,
  }
  if (fact.kind === "OHLCV") {
    await sql`INSERT INTO canonical.ohlcv (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,venue,symbol,resolution,open_time,close_time,open,high,low,close,volume,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.venue},${fact.symbolOrSubject},${fact.resolution},${fact.observedAt},${fact.closeTime},${fact.open},${fact.high},${fact.low},${fact.close},${fact.volume},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "FUNDING") {
    await sql`INSERT INTO canonical.funding (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,venue,symbol,canonical_instrument_id,market_type,funding_time,funding_rate,funding_interval_hours,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.venue},${fact.symbolOrSubject},${fact.canonicalInstrumentId},${fact.marketType},${fact.fundingTime},${fact.fundingRate},${fact.fundingIntervalHours},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "OPEN_INTEREST") {
    await sql`INSERT INTO canonical.open_interest (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,venue,symbol,canonical_instrument_id,market_type,observation_window,open_interest,unit,open_interest_value,value_unit,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.venue},${fact.symbolOrSubject},${fact.canonicalInstrumentId},${fact.marketType},${fact.window},${fact.openInterest},${fact.unit},${fact.openInterestValue},${fact.valueUnit},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "AGG_TRADE") {
    await sql`INSERT INTO canonical.agg_trades (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,venue,symbol,canonical_instrument_id,market_type,aggregate_trade_id,price,quantity,first_trade_id,last_trade_id,trade_time,source_timestamp,buyer_is_maker,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.venue},${fact.symbolOrSubject},${fact.canonicalInstrumentId},${fact.marketType},${fact.aggregateTradeId},${fact.price},${fact.quantity},${fact.firstTradeId},${fact.lastTradeId},${fact.tradeTime},${fact.sourceTimestamp},${fact.buyerIsMaker},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "LIQUIDATION") {
    await sql`INSERT INTO canonical.liquidations (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,provider_record_id,venue,symbol,side,price,quantity,event_time,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.providerRecordId},${fact.venue},${fact.symbolOrSubject},${fact.side},${fact.price},${fact.quantity},${fact.eventTime},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "PREDICTION_SNAPSHOT") {
    await sql`INSERT INTO canonical.prediction_snapshots (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,market_id,outcome_id,subject,probability,volume,liquidity,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.marketId},${fact.outcomeId},${fact.symbolOrSubject},${fact.probability},${fact.volume},${fact.liquidity},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "ETF_OBSERVATION") {
    await sql`INSERT INTO canonical.etf_observations (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,instrument_id,flow_value,currency,window_start,window_end,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.instrumentId},${fact.flowValue},${fact.currency},${fact.windowStart},${fact.windowEnd},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "RESERVE_OBSERVATION") {
    await sql`INSERT INTO canonical.reserve_observations (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,venue,asset,balance,unit,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.venue},${fact.asset},${fact.balance},${fact.unit},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else if (fact.kind === "MACRO_OBSERVATION") {
    await sql`INSERT INTO canonical.macro_observations (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,series_id,subject,value,unit,period,effective_at,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.seriesId},${fact.symbolOrSubject},${fact.value},${fact.unit},${fact.period},${fact.effectiveAt},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now())`
  } else {
    const segmentV2 = canonicalStreamSegmentV2Metadata(fact)
    await sql`INSERT INTO canonical.stream_manifests (fact_id,canonical_record_id,business_identity,record_version,commit_id,provider_id,stream_kind,venue,symbol,raw_object_id,window_start,window_end,first_sequence,last_sequence,record_count,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,checksum,observed_at,recorded_at,created_at,source_dataset_id,canonical_stream_id,canonical_instrument_id,source_partition_key,segment_contract_version,segment_object_key,segment_content_checksum,columnar_format,compression_format,segment_byte_length,event_time_min,event_time_max,validation_status,event_order_policy,source_raw_object_checksum)
      VALUES (${common.factId},${common.recordId},${common.businessId},${common.version},${common.commitId},${common.providerId},${fact.streamKind},${fact.venue},${fact.symbolOrSubject},${fact.rawObjectId},${fact.windowStart},${fact.windowEnd},${fact.firstSequence},${fact.lastSequence},${fact.recordCount},${common.registry},${common.provider},${common.certification},${common.policy},${common.schema},${common.normalization},${common.checksum},${common.observedAt},now(),now(),${segmentV2?.sourceDatasetId ?? null},${segmentV2?.canonicalStreamId ?? null},${segmentV2?.canonicalInstrumentId ?? null},${segmentV2?.sourcePartitionKey ?? null},${segmentV2?.segmentContractVersion ?? null},${segmentV2?.segmentObjectKey ?? null},${segmentV2?.segmentContentChecksum ?? null},${segmentV2?.columnarFormat ?? null},${segmentV2?.compressionFormat ?? null},${segmentV2?.segmentByteLength ?? null},${segmentV2?.eventTimeMin ?? null},${segmentV2?.eventTimeMax ?? null},${segmentV2?.validationStatus ?? null},${segmentV2?.eventOrderPolicy ?? null},${segmentV2?.sourceRawObjectChecksum ?? null})`
  }
}
