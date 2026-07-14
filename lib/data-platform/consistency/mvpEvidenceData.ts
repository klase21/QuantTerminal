import { canonicalChecksum } from "@/lib/data-platform/contracts";
import type { IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres";
import { createAggTradesSegmentReadPort } from "@/lib/data-platform/population/backfill";
import type {
  AvailableTemporalAlignmentInput,
  ConsistencyInputReference,
  ConsistencyResultInputReference,
  MvpDerivedMeasurementSet,
} from "./index";

export const MVP_EVIDENCE_SYMBOLS = Object.freeze([
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
] as const);
export const MVP_EVIDENCE_START = "2026-04-13T00:00:00.000Z";
export const MVP_EVIDENCE_AGG_START = "2026-06-28T00:00:00.000Z";
export const MVP_EVIDENCE_END = "2026-07-12T00:00:00.000Z";

type FactTable = "OHLCV" | "OPEN_INTEREST" | "FUNDING" | "STREAM_MANIFEST";
interface FactRow {
  readonly fact_id: string;
  readonly canonical_record_id: string;
  readonly business_identity: string;
  readonly record_version: number;
  readonly dataset_id: string;
  readonly provider_id: string;
  readonly symbol: string;
  readonly event_time: Date;
  readonly interval_end: Date | null;
  readonly value_a: string;
  readonly value_b: string | null;
  readonly value_c: string | null;
  readonly value_d: string | null;
  readonly checksum: string;
  readonly recorded_at: Date;
  readonly publication_state:
    | "PENDING"
    | "CERTIFIED"
    | "PUBLISHED"
    | "SUPERSEDED"
    | "REJECTED"
    | "REVOKED";
  readonly registry_snapshot_id: string;
  readonly provider_snapshot_id: string;
  readonly provider_certification_snapshot_id: string;
  readonly policy_version_id: string;
  readonly schema_version: string;
  readonly normalization_version: string;
  readonly lineage_node_id: string;
  readonly fact_table: FactTable;
}
interface SegmentRow extends FactRow {
  readonly object_key: string;
  readonly segment_checksum: string;
  readonly record_count: number;
  readonly event_time_max: Date;
}

export interface MvpEvidenceWindowData {
  readonly measurement: MvpDerivedMeasurementSet;
  readonly temporalInputs: readonly AvailableTemporalAlignmentInput[];
  readonly runInputs: readonly ConsistencyInputReference[];
  readonly resultInputs: readonly ConsistencyResultInputReference[];
}

const iso = (value: Date | string) => new Date(value).toISOString();
const secondIso = (value: Date | string) =>
  new Date(Math.floor(Date.parse(iso(value)) / 1_000) * 1_000).toISOString();
const day = (value: Date | string) => iso(value).slice(0, 10);
const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]!
      : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
    : null;
};
const percentile = (values: readonly number[], fraction: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length
    ? sorted[
        Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))
      ]!
    : null;
};
const rounded = (value: number) => Number(value.toFixed(8));

function governance(row: FactRow) {
  return {
    datasetRegistrySnapshotId: row.registry_snapshot_id,
    providerRegistrySnapshotId: row.provider_snapshot_id,
    providerCertificationSnapshotId: row.provider_certification_snapshot_id,
    policyVersionId: row.policy_version_id,
    schemaVersion: row.schema_version,
    normalizationVersion: row.normalization_version,
  };
}
function temporal(
  row: FactRow,
  roleId: string,
): AvailableTemporalAlignmentInput {
  const event = secondIso(row.event_time),
    end = row.interval_end ? secondIso(row.interval_end) : null;
  return Object.freeze({
    availability: "AVAILABLE",
    roleId,
    fact: {
      datasetId: row.dataset_id,
      businessIdentity: row.business_identity,
      canonicalRecordId: row.canonical_record_id,
      recordVersion: row.record_version,
      factTable: row.fact_table,
    },
    providerId: row.provider_id,
    effectiveAt: event,
    intervalStart: end ? event : null,
    intervalEnd: end,
    observedAt: event,
    knowledgeAvailableAt: secondIso(row.recorded_at),
    ingestedAt: secondIso(row.recorded_at),
    publicationState: row.publication_state,
    supersessionState: "ACTIVE",
    supersedes: null,
    checksum: row.checksum,
    cadenceClass:
      row.fact_table === "FUNDING"
        ? "EVENT"
        : row.fact_table === "STREAM_MANIFEST"
          ? "STREAM_MANIFEST"
          : "FIXED",
    resolutionClass:
      row.fact_table === "FUNDING"
        ? "EVENT_8H"
        : row.fact_table === "STREAM_MANIFEST"
          ? "STREAM_MANIFEST"
          : "FIXED_5M",
  });
}
function runInput(
  input: AvailableTemporalAlignmentInput,
  row: FactRow,
): ConsistencyInputReference {
  return Object.freeze({
    roleId: input.roleId,
    fact: input.fact,
    physicalFactId: row.fact_id,
    datasetId: row.dataset_id,
    providerId: row.provider_id,
    effectiveAt: input.effectiveAt,
    observedAt: input.observedAt,
    knowledgeAvailableAt: input.knowledgeAvailableAt!,
    publicationState: input.publicationState,
    checksum: row.checksum,
    governance: governance(row),
    lineageNodeId: row.lineage_node_id,
  });
}
function resultInput(
  input: AvailableTemporalAlignmentInput,
  row: FactRow,
): ConsistencyResultInputReference {
  return Object.freeze({
    roleId: input.roleId,
    canonicalRecordId: row.canonical_record_id,
    recordVersion: row.record_version,
    datasetId: row.dataset_id,
    providerId: row.provider_id,
    providerSnapshotId: row.provider_snapshot_id,
    effectiveAt: input.effectiveAt,
    observedAt: input.observedAt,
    knowledgeAvailableAt: input.knowledgeAvailableAt!,
    publicationState: input.publicationState,
    supersessionState: "ACTIVE",
    checksum: row.checksum,
    lineageNodeId: row.lineage_node_id,
  });
}

async function loadRows(d2: IsolatedPostgresClient) {
  const common = `rv.current_publication_state publication_state,rv.registry_snapshot_id,rv.provider_snapshot_id,rv.provider_certification_snapshot_id,rv.policy_version_id,rv.schema_version,rv.normalization_version,le.edge_id lineage_node_id`;
  const [ohlcv, oi, funding, segments] = await Promise.all([
    d2.sql.unsafe<FactRow[]>(
      `SELECT o.fact_id,o.canonical_record_id,o.business_identity,o.record_version,'ohlcv' dataset_id,o.provider_id,o.symbol,o.open_time event_time,o.close_time interval_end,o.open::text value_a,o.close::text value_b,o.high::text value_c,o.low::text value_d,o.checksum,o.recorded_at,${common},'OHLCV' fact_table FROM canonical.ohlcv o JOIN repository.record_versions rv USING(canonical_record_id,record_version) JOIN repository.lineage_edges le ON le.destination_node_id=o.canonical_record_id AND le.destination_node_version=o.record_version::text AND le.source_node_type='RAW_OBJECT' WHERE o.open_time >= $1 AND o.open_time < $2 AND o.symbol=ANY($3) ORDER BY o.symbol,o.open_time`,
      [MVP_EVIDENCE_START, MVP_EVIDENCE_END, MVP_EVIDENCE_SYMBOLS],
    ),
    d2.sql.unsafe<FactRow[]>(
      `SELECT o.fact_id,o.canonical_record_id,o.business_identity,o.record_version,'open-interest' dataset_id,o.provider_id,o.symbol,o.observed_at event_time,NULL::timestamptz interval_end,o.open_interest::text value_a,NULL::text value_b,NULL::text value_c,NULL::text value_d,o.checksum,o.recorded_at,${common},'OPEN_INTEREST' fact_table FROM canonical.open_interest o JOIN repository.record_versions rv USING(canonical_record_id,record_version) JOIN repository.lineage_edges le ON le.destination_node_id=o.canonical_record_id AND le.destination_node_version=o.record_version::text AND le.source_node_type='RAW_OBJECT' WHERE o.observed_at >= $1 AND o.observed_at < $2 AND o.symbol=ANY($3) ORDER BY o.symbol,o.observed_at`,
      [MVP_EVIDENCE_START, MVP_EVIDENCE_END, MVP_EVIDENCE_SYMBOLS],
    ),
    d2.sql.unsafe<FactRow[]>(
      `SELECT f.fact_id,f.canonical_record_id,f.business_identity,f.record_version,'funding' dataset_id,f.provider_id,f.symbol,f.funding_time event_time,NULL::timestamptz interval_end,f.funding_rate::text value_a,NULL::text value_b,NULL::text value_c,NULL::text value_d,f.checksum,f.recorded_at,${common},'FUNDING' fact_table FROM canonical.funding f JOIN repository.record_versions rv USING(canonical_record_id,record_version) JOIN repository.lineage_edges le ON le.destination_node_id=f.canonical_record_id AND le.destination_node_version=f.record_version::text AND le.source_node_type='RAW_OBJECT' WHERE f.funding_time >= $1 AND f.funding_time < $2 AND f.symbol=ANY($3) ORDER BY f.symbol,f.funding_time`,
      [MVP_EVIDENCE_START, MVP_EVIDENCE_END, MVP_EVIDENCE_SYMBOLS],
    ),
    d2.sql.unsafe<SegmentRow[]>(
      `SELECT m.fact_id,m.canonical_record_id,m.business_identity,m.record_version,'agg-trade' dataset_id,m.provider_id,m.symbol,m.window_start event_time,m.window_end interval_end,m.record_count::text value_a,NULL::text value_b,NULL::text value_c,NULL::text value_d,m.checksum,m.recorded_at,${common},'STREAM_MANIFEST' fact_table,m.segment_object_key object_key,m.segment_content_checksum segment_checksum,m.record_count::int record_count,m.event_time_max FROM canonical.stream_manifests m JOIN repository.record_versions rv USING(canonical_record_id,record_version) JOIN repository.lineage_edges le ON le.destination_node_id=m.canonical_record_id AND le.destination_node_version=m.record_version::text AND le.source_node_type='RAW_OBJECT' WHERE m.source_dataset_id='agg-trade' AND m.segment_contract_version='2' AND m.window_start >= $1 AND m.window_end <= $2 AND m.symbol=ANY($3) ORDER BY m.symbol,m.window_start`,
      [MVP_EVIDENCE_AGG_START, MVP_EVIDENCE_END, MVP_EVIDENCE_SYMBOLS],
    ),
  ]);
  return { ohlcv, oi, funding, segments };
}

export async function readMvpEvidenceWindows(input: {
  readonly d2: IsolatedPostgresClient;
  readonly objectRoot: string;
}): Promise<readonly MvpEvidenceWindowData[]> {
  const rows = await loadRows(input.d2);
  const segmentPort = createAggTradesSegmentReadPort({
    objectRoot: input.objectRoot,
  });
  const flow = new Map<
    string,
    { buy: string; sell: string; count: number; max: string; checksum: string }
  >();
  for (const segment of rows.segments) {
    const summary = await segmentPort.summarizeFlow({
      objectKey: segment.object_key,
      expectedChecksum: segment.segment_checksum,
      expectedEventCount: segment.record_count,
    });
    flow.set(`${segment.symbol}:${day(segment.event_time)}`, {
      buy: summary.aggressiveBuyQuantity,
      sell: summary.aggressiveSellQuantity,
      count: summary.eventCount,
      max: summary.eventTimeMaximum,
      checksum: segment.segment_checksum,
    });
  }
  const output: MvpEvidenceWindowData[] = [];
  for (const symbol of MVP_EVIDENCE_SYMBOLS) {
    const symbolOhlcv = rows.ohlcv.filter((row) => row.symbol === symbol),
      symbolOi = rows.oi.filter((row) => row.symbol === symbol),
      symbolFunding = rows.funding.filter((row) => row.symbol === symbol),
      symbolSegments = rows.segments.filter((row) => row.symbol === symbol);
    const dates = [
      ...new Set(symbolSegments.map((row) => day(row.event_time))),
    ].sort();
    const dailyOiChanges = [
      ...new Set(symbolOi.map((row) => day(row.event_time))),
    ]
      .sort()
      .map((date) => {
        const current = symbolOi.filter((row) => day(row.event_time) === date);
        return {
          date,
          value:
            current.length > 1
              ? Math.abs(
                  (Number(current.at(-1)!.value_a) /
                    Number(current[0]!.value_a) -
                    1) *
                    100,
                )
              : null,
        };
      });
    const tradeCounts = dates.map(
      (date) => flow.get(`${symbol}:${date}`)?.count ?? 0,
    );
    for (let index = 0; index < dates.length; index += 1) {
      const date = dates[index]!,
        start = `${date}T00:00:00.000Z`,
        end = new Date(Date.parse(start) + 86_400_000).toISOString();
      const currentOhlcv = symbolOhlcv.filter(
          (row) => day(row.event_time) === date,
        ),
        currentOi = symbolOi.filter((row) => day(row.event_time) === date),
        currentFunding = symbolFunding.filter(
          (row) => day(row.event_time) === date,
        ),
        segment = symbolSegments.find((row) => day(row.event_time) === date)!;
      const baselineStart = Date.parse(start) - 30 * 86_400_000;
      const baselineRows = [
        ...symbolOhlcv,
        ...symbolOi,
        ...symbolFunding,
      ].filter(
        (row) =>
          Date.parse(iso(row.event_time)) >= baselineStart &&
          Date.parse(iso(row.event_time)) < Date.parse(start),
      );
      const baselineFunding = symbolFunding
        .filter(
          (row) =>
            Date.parse(iso(row.event_time)) >= baselineStart &&
            Date.parse(iso(row.event_time)) < Date.parse(start),
        )
        .map((row) => Math.abs(Number(row.value_a)));
      const exact = [
        currentOhlcv[0],
        currentOhlcv.at(-1),
        currentOi[0],
        currentOi.at(-1),
        ...currentFunding,
        segment,
      ].filter((row): row is FactRow => Boolean(row));
      const temporalInputs = exact.map((row, ordinal) =>
        temporal(row, `${row.dataset_id}:${ordinal}`),
      );
      const refs = [
        ...new Set(
          [
            ...baselineRows,
            ...exact,
            ...symbolSegments.filter(
              (row) => Date.parse(iso(row.event_time)) < Date.parse(end),
            ),
          ].map(
            (row) =>
              `${row.canonical_record_id}:${row.record_version}:${row.checksum}`,
          ),
        ),
      ].sort();
      const currentFlow = flow.get(`${symbol}:${date}`)!;
      const buy = Number(currentFlow.buy),
        sell = Number(currentFlow.sell),
        total = buy + sell;
      const rawKnowledgeCutoff = exact
        .map((row) => iso(row.recorded_at))
        .sort()
        .at(-1)!;
      const knowledgeTimeCutoff = new Date(
        Math.floor(Date.parse(rawKnowledgeCutoff) / 1_000) * 1_000,
      ).toISOString();
      const oiBaseline = median(
        dailyOiChanges
          .filter(
            (entry) =>
              Date.parse(`${entry.date}T00:00:00.000Z`) >= baselineStart &&
              entry.date < date,
          )
          .map((entry) => entry.value)
          .filter((value): value is number => value !== null),
      );
      const countBaseline = median(tradeCounts.slice(0, index + 1));
      const firstOpen = Number(currentOhlcv[0]?.value_a),
        lastClose = Number(currentOhlcv.at(-1)?.value_b),
        oiFirst = Number(currentOi[0]?.value_a),
        oiLast = Number(currentOi.at(-1)?.value_a);
      const maximumInputEventTime = [
        currentOhlcv.at(-1)?.event_time,
        currentOi.at(-1)?.event_time,
        currentFunding.at(-1)?.event_time,
        currentFlow.max,
      ]
        .filter(Boolean)
        .map((value) => iso(value as Date | string))
        .sort()
        .at(-1)!;
      const coverage = Object.freeze({
        ohlcv: currentOhlcv.length === 288 ? 1 : currentOhlcv.length / 288,
        openInterest: currentOi.length ? 1 : 0,
        funding: currentFunding.length ? 1 : 0,
        aggTrades:
          segment && currentFlow.count === segment.record_count ? 1 : 0,
      });
      const measurement: MvpDerivedMeasurementSet = Object.freeze({
        instrument: symbol,
        eventTimeStart: start,
        eventTimeEnd: end,
        knowledgeTimeCutoff,
        calculationVersion: "mvp-market-measurements/1.0.0",
        priceReturnPct:
          firstOpen && lastClose
            ? rounded((lastClose / firstOpen - 1) * 100)
            : null,
        realizedRangePct: firstOpen
          ? rounded(
              ((Math.max(...currentOhlcv.map((row) => Number(row.value_c))) -
                Math.min(...currentOhlcv.map((row) => Number(row.value_d)))) /
                firstOpen) *
                100,
            )
          : null,
        oiChangePct:
          oiFirst && oiLast ? rounded((oiLast / oiFirst - 1) * 100) : null,
        oiBaselineMedianAbsChangePct:
          oiBaseline === null ? null : rounded(oiBaseline),
        fundingLatestRate: currentFunding.length
          ? Number(currentFunding.at(-1)!.value_a)
          : null,
        fundingPreviousRate: symbolFunding
          .filter((row) => Date.parse(iso(row.event_time)) < Date.parse(start))
          .at(-1)
          ? Number(
              symbolFunding
                .filter(
                  (row) => Date.parse(iso(row.event_time)) < Date.parse(start),
                )
                .at(-1)!.value_a,
            )
          : null,
        fundingBaselineAbsPercentile: percentile(baselineFunding, 0.8),
        fundingNormalizationRatio:
          currentFunding.length && percentile(baselineFunding, 0.8)
            ? rounded(
                Math.abs(Number(currentFunding.at(-1)!.value_a)) /
                  percentile(baselineFunding, 0.8)!,
              )
            : null,
        aggressiveBuyQuantity: currentFlow.buy,
        aggressiveSellQuantity: currentFlow.sell,
        aggressiveImbalanceRatio: total ? rounded((buy - sell) / total) : null,
        tradeCount: currentFlow.count,
        tradeCountIntensity: countBaseline
          ? rounded(currentFlow.count / countBaseline)
          : null,
        coverage,
        sourceReferenceDigest: canonicalChecksum(refs),
        sourceReferenceCount: refs.length,
        lineageReferenceCount: refs.length,
        segmentChecksum: currentFlow.checksum,
        maximumInputEventTime,
        completeness: Object.values(coverage).every((value) => value >= 0.95)
          ? "COMPLETE"
          : "LIMITED",
        limitationCodes: Object.freeze(
          Object.values(coverage).every((value) => value >= 0.95)
            ? []
            : ["INPUT_COVERAGE_LIMITED"],
        ),
      });
      output.push(
        Object.freeze({
          measurement,
          temporalInputs: Object.freeze(temporalInputs),
          runInputs: Object.freeze(
            temporalInputs.map((value, ordinal) =>
              runInput(value, exact[ordinal]!),
            ),
          ),
          resultInputs: Object.freeze(
            temporalInputs.map((value, ordinal) =>
              resultInput(value, exact[ordinal]!),
            ),
          ),
        }),
      );
    }
  }
  return Object.freeze(output);
}
