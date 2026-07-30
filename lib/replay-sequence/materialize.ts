import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createDurableCanonicalPostgresClientFromEnvironment } from "@/lib/data-platform/persistence/postgres"
import type { IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import { createAggTradesSegmentReadPort } from "@/lib/data-platform/population/backfill"
import type { ConsumerProjection } from "@/lib/data-platform/consumer-projections"
import type { ReplayFlowBucket, ReplaySequenceModel, ReplaySequenceStep } from "./contracts"

interface PriceRow { open_time: Date; open: string; high: string; low: string; close: string; volume: string; checksum: string }
interface OiRow { observed_at: Date; open_interest: string; checksum: string }
interface FundingRow { funding_time: Date; funding_rate: string; provider_id: string; checksum: string }
interface SegmentRow { segment_object_key: string; segment_content_checksum: string; record_count: number }

const finite = (value: string) => { const parsed = Number(value); if (!Number.isFinite(parsed)) throw new Error("REPLAY_SEQUENCE_NON_FINITE_VALUE"); return parsed }
const iso = (value: Date | string) => new Date(value).toISOString()
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
const CHECKSUM = /^[0-9a-f]{64}$/

function verifiedFundingRows(funding: readonly FundingRow[], start: number, end: number): boolean {
  const timestamps = funding.map((row) => iso(row.funding_time))
  return funding.length > 0
    && new Set(timestamps).size === timestamps.length
    && funding.every((row, index) => {
      const timestamp = Date.parse(timestamps[index]!)
      return Number.isFinite(timestamp)
        && timestamp >= start
        && timestamp < end
        && row.provider_id.trim().length > 0
        && CHECKSUM.test(row.checksum)
    })
}

function buildSequence(projection: ConsumerProjection, priceRows: readonly PriceRow[], oiRows: readonly OiRow[], funding: readonly FundingRow[], flowBuckets: readonly ReplayFlowBucket[]): readonly ReplaySequenceStep[] {
  const lanes = record(projection.payload.lanes), price = record(lanes.ohlcv), oi = record(lanes.openInterest), flow = record(lanes.aggTradesSummary)
  const marker = record((Array.isArray(lanes.evidenceMarkers) ? lanes.evidenceMarkers : [])[0]), state = String(lanes.assessmentState ?? marker.state ?? "NEUTRAL")
  const priceReturn = typeof price.returnPct === "number" ? price.returnPct : null, oiChange = typeof oi.changePct === "number" ? oi.changePct : null, imbalance = typeof flow.imbalanceRatio === "number" ? flow.imbalanceRatio : null
  const end = projection.eventTimeEnd, fundingEvent = funding.at(-1)
  const firstPrice = priceRows[0] ? finite(priceRows[0].close) : null, firstOi = oiRows[0] ? finite(oiRows[0].open_interest) : null
  const materialOi = firstOi === null ? null : oiRows.find((row) => Math.abs((finite(row.open_interest) / firstOi - 1) * 100) >= 2)
  const materialPrice = firstPrice === null ? null : priceRows.find((row) => Math.abs((finite(row.close) / firstPrice - 1) * 100) >= 1)
  const strongestFlow = [...flowBuckets].sort((left, right) => Math.abs(right.imbalanceRatio ?? 0) - Math.abs(left.imbalanceRatio ?? 0))[0]
  const steps: ReplaySequenceStep[] = []
  if (oiChange !== null) steps.push({ sequence: 0, eventTime: materialOi ? iso(materialOi.observed_at) : end, code: oiChange >= 2 ? "OI_MATERIALLY_EXPANDED" : oiChange <= -2 ? "OI_MATERIALLY_CONTRACTED" : "OI_CHANGE_WITHIN_BASELINE", relationship: Math.abs(oiChange) >= 2 ? "SUPPORTS" : "NEUTRAL", statement: `Open interest ${oiChange >= 2 ? "expanded" : oiChange <= -2 ? "contracted" : "remained within its baseline range"} across the window.`, measuredValue: oiChange, unit: "PERCENTAGE_POINTS" })
  if (fundingEvent) steps.push({ sequence: 0, eventTime: iso(fundingEvent.funding_time), code: "FUNDING_BELOW_PRESSURE_THRESHOLD", relationship: "OPPOSES", statement: "The provider-native Funding event remained below the governed pressure threshold.", measuredValue: finite(fundingEvent.funding_rate), unit: "RATE" })
  if (imbalance !== null) steps.push({ sequence: 0, eventTime: strongestFlow?.eventTime ?? end, code: Math.abs(imbalance) >= 0.1 ? imbalance > 0 ? "AGGRESSIVE_BUY_QUANTITY_DOMINATED" : "AGGRESSIVE_SELL_QUANTITY_DOMINATED" : "AGGRESSIVE_FLOW_BALANCED", relationship: Math.abs(imbalance) >= 0.1 ? "SUPPORTS" : "OPPOSES", statement: Math.abs(imbalance) >= 0.1 ? `Aggressive ${imbalance > 0 ? "buying" : "selling"} dominated the bounded flow buckets.` : "Aggressive buying and selling remained below the governed dominance threshold.", measuredValue: imbalance, unit: "RATIO" })
  if (priceReturn !== null) steps.push({ sequence: 0, eventTime: materialPrice ? iso(materialPrice.open_time) : end, code: priceReturn > 0 ? "PRICE_ROSE" : priceReturn < 0 ? "PRICE_FELL" : "PRICE_FLAT", relationship: "SUPPORTS", statement: `Price ${priceReturn > 0 ? "rose" : priceReturn < 0 ? "fell" : "was effectively flat"} during the same bounded window.`, measuredValue: priceReturn, unit: "PERCENTAGE_POINTS" })
  steps.push({ sequence: 0, eventTime: end, code: state, relationship: "NEUTRAL", statement: `The governed assessment classified the window as ${state.toLowerCase().replace(/_/g, " ")}; opposing observations remain part of the conclusion.`, measuredValue: null, unit: null })
  return Object.freeze(steps.sort((left, right) => Date.parse(left.eventTime) - Date.parse(right.eventTime)).map((step, index) => Object.freeze({ ...step, sequence: index + 1 })))
}

export async function materializeMvpReplaySequence(projection: ConsumerProjection): Promise<ReplaySequenceModel> {
  const client = createDurableCanonicalPostgresClientFromEnvironment({ roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 5, idleTimeoutSeconds: 15, applicationName: "mvp-replay-sequence-materializer", targetPurpose: "INTEGRATED_BACKFILL" })
  try {
    const root = process.env.D3_BACKFILL_OBJECT_ROOT
    if (!root) throw new Error("REPLAY_SEQUENCE_OBJECT_ROOT_REQUIRED")
    return await materializeMvpReplaySequenceFromCore({ projection, core: client, objectRoot: root })
  } finally { await client.shutdown() }
}

export async function materializeMvpReplaySequenceFromCore(input: { readonly projection: ConsumerProjection; readonly core: Pick<IsolatedPostgresClient, "sql">; readonly objectRoot: string }): Promise<ReplaySequenceModel> {
  const projection = input.projection
  if (projection.projectionKind !== "ReplayTimelineProjection") throw new Error("REPLAY_SEQUENCE_PROJECTION_KIND_INVALID")
  const start = Date.parse(projection.eventTimeStart), end = Date.parse(projection.eventTimeEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start !== 86_400_000) throw new Error("REPLAY_SEQUENCE_WINDOW_INVALID")
  const client = input.core
    const [price, openInterest, funding, segment] = await Promise.all([
      client.sql.unsafe<PriceRow[]>("SELECT open_time,open::text,high::text,low::text,close::text,volume::text,checksum FROM canonical.ohlcv WHERE symbol=$1 AND open_time >= $2 AND open_time < $3 ORDER BY open_time", [projection.subjectId, projection.eventTimeStart, projection.eventTimeEnd]),
      client.sql.unsafe<OiRow[]>("SELECT observed_at,open_interest::text,checksum FROM canonical.open_interest WHERE symbol=$1 AND observed_at >= $2 AND observed_at < $3 ORDER BY observed_at", [projection.subjectId, projection.eventTimeStart, projection.eventTimeEnd]),
      client.sql.unsafe<FundingRow[]>("SELECT funding_time,funding_rate::text,provider_id,checksum FROM canonical.funding WHERE symbol=$1 AND funding_time >= $2 AND funding_time < $3 ORDER BY funding_time", [projection.subjectId, projection.eventTimeStart, projection.eventTimeEnd]),
      client.sql.unsafe<SegmentRow[]>("SELECT segment_object_key,segment_content_checksum,record_count::int FROM canonical.stream_manifests WHERE source_dataset_id='agg-trade' AND segment_contract_version='2' AND symbol=$1 AND window_start=$2 AND window_end=$3", [projection.subjectId, projection.eventTimeStart, projection.eventTimeEnd]),
    ])
    if (price.length !== 288 || openInterest.length !== 288 || !verifiedFundingRows(funding, start, end) || segment.length !== 1) throw new Error("REPLAY_SEQUENCE_REQUIRED_INPUT_MISSING")
    const flowSummary = await createAggTradesSegmentReadPort({ objectRoot: input.objectRoot }).summarizeFlowBuckets({ objectKey: segment[0]!.segment_object_key, expectedChecksum: segment[0]!.segment_content_checksum, expectedEventCount: segment[0]!.record_count, windowStart: projection.eventTimeStart, windowEnd: projection.eventTimeEnd, bucketMinutes: 30 })
    const lanes = record(projection.payload.lanes), marker = record((Array.isArray(record(lanes).evidenceMarkers) ? record(lanes).evidenceMarkers as unknown[] : [])[0])
    const flow = Object.freeze(flowSummary.buckets.map((bucket) => Object.freeze({ bucketId: `flow_${canonicalChecksum({ projection: projection.projectionVersionId, start: bucket.bucketStart })}`, eventTime: bucket.bucketStart, bucketEnd: bucket.bucketEnd, aggressiveBuyQuantity: bucket.aggressiveBuyQuantity, aggressiveSellQuantity: bucket.aggressiveSellQuantity, imbalanceRatio: bucket.imbalanceRatio, tradeCount: bucket.eventCount })))
    const base = {
      status: "AVAILABLE" as const, modelVersion: "mvp-replay-sequence/1.0.0" as const, instrument: projection.subjectId, eventTimeStart: projection.eventTimeStart, eventTimeEnd: projection.eventTimeEnd,
      sourceProjectionVersionId: projection.projectionVersionId, sourceProjectionChecksum: projection.projectionChecksum, marketState: String(lanes.assessmentState ?? marker.state ?? "NEUTRAL"), evidencePacketId: String(marker.packetId ?? "UNAVAILABLE"),
      price: Object.freeze(price.map((row) => Object.freeze({ eventTime: iso(row.open_time), value: finite(row.close), open: finite(row.open), high: finite(row.high), low: finite(row.low), close: finite(row.close), volume: finite(row.volume), sourceChecksum: row.checksum }))),
      openInterest: Object.freeze(openInterest.map((row) => Object.freeze({ eventTime: iso(row.observed_at), value: finite(row.open_interest), sourceChecksum: row.checksum }))),
      funding: Object.freeze(funding.map((row) => Object.freeze({ eventTime: iso(row.funding_time), value: finite(row.funding_rate), providerId: row.provider_id, sourceChecksum: row.checksum }))),
      flow,
      sequence: buildSequence(projection, price, openInterest, funding, flow), sampleCounts: Object.freeze({ price: price.length, openInterest: openInterest.length, funding: funding.length, flow: flowSummary.buckets.length }), limitations: Object.freeze([...new Set([...projection.limitations, ...list(projection.payload.unavailableLanes)])].sort()),
    }
    return Object.freeze({ ...base, modelChecksum: canonicalChecksum(base) })
}
