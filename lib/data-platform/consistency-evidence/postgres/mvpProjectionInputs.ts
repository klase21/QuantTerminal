import { createMvpMarketAssessment, readMvpEvidenceWindows, type MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import type { IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import type { D3PostgresClient } from "@/lib/data-platform/population/postgres"
import type { MvpProjectionEvidenceInput } from "@/lib/data-platform/evidence-platform"
import type { ConsistencyPostgresRuntime } from "./client"

export interface MvpProjectionInputCorpus { readonly corpusId: string; readonly corpusChecksum: string }

export async function loadMvpProjectionEvidenceInputs(input: { readonly corpus: MvpProjectionInputCorpus; readonly d4: ConsistencyPostgresRuntime; readonly d2: Pick<IsolatedPostgresClient, "sql">; readonly d3: Pick<D3PostgresClient, "sql">; readonly objectRoot: string; readonly eventTimeStart?: string; readonly eventTimeEnd?: string; readonly instruments?: readonly string[] }): Promise<readonly MvpProjectionEvidenceInput[]> {
  const bounded = input.eventTimeStart !== undefined || input.eventTimeEnd !== undefined || input.instruments !== undefined
  if (bounded && (input.eventTimeStart === undefined || input.eventTimeEnd === undefined || input.instruments === undefined)) throw new Error("BOUNDED_PROJECTION_INPUT_CONTRACT_INCOMPLETE")
  const windows: readonly MvpEvidenceWindowData[] = await readMvpEvidenceWindows({ d2: input.d2, objectRoot: input.objectRoot, ...(bounded ? { eventTimeStart: input.eventTimeStart, eventTimeEnd: input.eventTimeEnd, instruments: input.instruments } : {}) })
  const subjects = bounded ? input.instruments! : null, start = bounded ? input.eventTimeStart! : null, end = bounded ? input.eventTimeEnd! : null
  const stored = await input.d4.sql.unsafe<Array<{ subject_id: string; event_time_start: Date; assessment_checksum: string; packet_version_id: string; packet_id: string; packet_checksum: string }>>("SELECT a.subject_id,a.event_time_start,a.assessment_checksum,a.packet_version_id,i.packet_id,v.packet_checksum FROM evidence.mvp_market_assessments a JOIN evidence.core_packet_versions v USING(packet_version_id) JOIN evidence.core_packet_identities i USING(packet_id) WHERE ($1::timestamptz IS NULL OR a.event_time_start >= $1) AND ($2::timestamptz IS NULL OR a.event_time_end <= $2) AND ($3::text[] IS NULL OR a.subject_id=ANY($3)) ORDER BY a.subject_id,a.event_time_start", [start,end,subjects])
  const packetIds = stored.map((row) => row.packet_version_id)
  if (!packetIds.length) return Object.freeze([])
  const [results, facts, coverage, prices] = await Promise.all([
    input.d4.sql.unsafe<Array<{ packet_version_id: string; result_id: string; result_checksum: string }>>("SELECT DISTINCT r.packet_version_id,r.result_id,i.result_checksum FROM evidence.core_packet_result_references r JOIN consistency.immutable_results i USING(result_id) WHERE r.packet_version_id=ANY($1) ORDER BY r.packet_version_id,r.result_id", [packetIds]),
    input.d4.sql.unsafe<Array<{ packet_version_id: string; canonical_record_id: string; record_version: number; input_checksum: string; dataset_id: string; provider_id: string; publication_state: "PENDING" }>>("SELECT DISTINCT packet_version_id,canonical_record_id,record_version,input_checksum,dataset_id,provider_id,publication_state FROM evidence.core_packet_fact_references WHERE packet_version_id=ANY($1) ORDER BY packet_version_id,dataset_id,canonical_record_id,record_version", [packetIds]),
    input.d4.sql.unsafe<Array<{ coverage_version_id: string; dataset_id: string; venue: string; subject: string; window_start: Date; window_end: Date }>>("SELECT coverage_version_id,dataset_id,venue,subject,window_start,window_end FROM coverage.projection_versions WHERE status='AVAILABLE' AND ($1::timestamptz IS NULL OR window_start >= $1) AND ($2::timestamptz IS NULL OR window_end <= $2) AND ($3::text[] IS NULL OR subject=ANY($3)) ORDER BY subject,dataset_id,coverage_version_id", [start,end,subjects]),
    input.d2.sql.unsafe<Array<{ symbol: string; utc_day: string; close: string }>>("SELECT symbol,to_char(open_time AT TIME ZONE 'UTC','YYYY-MM-DD') utc_day,close::text close FROM canonical.ohlcv WHERE ($1::timestamptz IS NULL OR open_time >= $1) AND ($2::timestamptz IS NULL OR open_time < $2) AND ($3::text[] IS NULL OR symbol=ANY($3)) AND extract(hour from open_time AT TIME ZONE 'UTC')=23 AND extract(minute from open_time AT TIME ZONE 'UTC')=55 ORDER BY symbol,open_time", [start ?? "2026-06-28T00:00:00.000Z",end ?? "2026-07-12T00:00:00.000Z",subjects]),
  ])
  const byWindow = new Map(stored.map((row) => [`${row.subject_id}:${new Date(row.event_time_start).toISOString()}`, row]))
  return Object.freeze(windows.map((window): MvpProjectionEvidenceInput => {
    const assessment = createMvpMarketAssessment({ corpusId: input.corpus.corpusId, corpusChecksum: input.corpus.corpusChecksum, measurement: window.measurement })
    const persisted = byWindow.get(`${assessment.instrument}:${assessment.eventTimeStart}`)
    if (!persisted || persisted.assessment_checksum !== assessment.assessmentChecksum) throw new Error(`MVP_PROJECTION_EVIDENCE_BINDING_MISMATCH:${assessment.instrument}:${assessment.eventTimeStart}`)
    const date = assessment.eventTimeStart.slice(0, 10), expectedDatasets = ["agg-trade","funding","ohlcv","open-interest"], matchingCoverage = coverage.filter((row) => row.subject === assessment.instrument && new Date(row.window_start).toISOString() === assessment.eventTimeStart && new Date(row.window_end).toISOString() === assessment.eventTimeEnd)
    if (matchingCoverage.length !== expectedDatasets.length || expectedDatasets.some((dataset) => !matchingCoverage.some((row) => row.dataset_id === dataset))) throw new Error(`MVP_PROJECTION_COVERAGE_DEPENDENCY_MISSING:${assessment.instrument}:${date}`)
    const coverageDecisionIds = matchingCoverage.map((row) => row.coverage_version_id)
    const factReferences = facts.filter((row) => row.packet_version_id === persisted.packet_version_id)
    if (factReferences.some((row) => row.publication_state !== "PENDING")) throw new Error("MVP_PROJECTION_SOURCE_PUBLICATION_NOT_PENDING")
    const latestPrice = prices.find((row) => row.symbol === assessment.instrument && row.utc_day === date)?.close
    if (!latestPrice) throw new Error(`MVP_PROJECTION_LATEST_PRICE_MISSING:${assessment.instrument}:${date}`)
    return Object.freeze({ assessment, packetId: persisted.packet_id, packetVersionId: persisted.packet_version_id, packetChecksum: persisted.packet_checksum, resultReferences: Object.freeze(results.filter((row) => row.packet_version_id === persisted.packet_version_id).map((row) => Object.freeze({ resultId: row.result_id, checksum: row.result_checksum }))), factReferences: Object.freeze(factReferences.map((row) => Object.freeze({ id: row.canonical_record_id, version: String(row.record_version), checksum: row.input_checksum, datasetId: row.dataset_id, providerId: row.provider_id, publicationState: row.publication_state }))), coverageDecisionIds: Object.freeze(coverageDecisionIds), latestPrice })
  }))
}
