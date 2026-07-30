import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import type { ConsistencyPostgresRuntime } from "./client"

export interface MvpCoverageCommitReference {
  readonly commitId: string
  readonly checksum: string
  readonly datasetId: string
  readonly providerId: string
  readonly providerSnapshotId: string
}

export interface MvpBoundedCoverageResult {
  readonly coverageVersionId: string
  readonly datasetId: string
  readonly venue: string
  readonly subject: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceWatermark: string
  readonly sourceRecordSetDigest: string
  readonly status: "AVAILABLE"
  readonly policyVersionId: string
  readonly providerId: string
  readonly providerSnapshotIds: readonly string[]
  readonly inputCommitIds: readonly string[]
  readonly coverageChecksum: string
  readonly computedAt: string
}

export function createMvpBoundedCoverageResult(input: {
  readonly datasetId: string
  readonly venue: string
  readonly subject: string
  readonly windowStart: string
  readonly windowEnd: string
  readonly sourceWatermark: string
  readonly policyVersionId: string
  readonly commits: readonly MvpCoverageCommitReference[]
  readonly computedAt: string
}): MvpBoundedCoverageResult {
  if (!input.datasetId || !input.venue || !input.subject || !input.policyVersionId || Date.parse(input.windowEnd) <= Date.parse(input.windowStart) || input.sourceWatermark !== input.windowEnd || !input.commits.length) throw new Error("MVP_BOUNDED_COVERAGE_INPUT_INVALID")
  if (input.commits.some((item) => item.datasetId !== input.datasetId || !item.commitId || !/^[0-9a-f]{64}$/.test(item.checksum) || !item.providerId || !item.providerSnapshotId)) throw new Error("MVP_BOUNDED_COVERAGE_SCOPE_MISMATCH")
  const providers = [...new Set(input.commits.map((item) => item.providerId))].sort()
  if (providers.length !== 1) throw new Error("MVP_BOUNDED_COVERAGE_PROVIDER_MISMATCH")
  const commits = [...input.commits].sort((left, right) => left.commitId.localeCompare(right.commitId))
  if (new Set(commits.map((item) => item.commitId)).size !== commits.length) throw new Error("MVP_BOUNDED_COVERAGE_DUPLICATE_COMMIT")
  const sourceRecordSetDigest = canonicalChecksum(commits.map((item) => ({ commitId: item.commitId, checksum: item.checksum })))
  const base = {
    datasetId: input.datasetId,
    venue: input.venue,
    subject: input.subject,
    windowStart: input.windowStart,
    windowEnd: input.windowEnd,
    sourceWatermark: input.sourceWatermark,
    sourceRecordSetDigest,
    status: "AVAILABLE" as const,
    policyVersionId: input.policyVersionId,
    providerId: providers[0]!,
    providerSnapshotIds: [...new Set(commits.map((item) => item.providerSnapshotId))].sort(),
    inputCommitIds: commits.map((item) => item.commitId),
  }
  const coverageChecksum = canonicalChecksum(base)
  return Object.freeze({ ...base, coverageVersionId: `mvp_cov_${coverageChecksum}`, coverageChecksum, computedAt: input.computedAt })
}

export class MvpCoverageStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime) {
    if (runtime.roleIntent !== "CONSISTENCY_WORKER") throw new Error("CONSISTENCY_WORKER_ROLE_REQUIRED")
  }

  async persist(input: {
    readonly canonical: Pick<IsolatedPostgresClient, "sql">
    readonly result: MvpBoundedCoverageResult
  }): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly result: MvpBoundedCoverageResult }> {
    const verified = await input.canonical.sql.unsafe<Array<{ commit_id: string; dataset_id: string; provider_id: string }>>(
      "SELECT commit_id,dataset_id,provider_id FROM control.canonical_commits WHERE commit_id=ANY($1) ORDER BY commit_id",
      [input.result.inputCommitIds],
    )
    if (verified.length !== input.result.inputCommitIds.length || verified.some((row) => row.dataset_id !== input.result.datasetId || row.provider_id !== input.result.providerId)) throw new Error("MVP_BOUNDED_COVERAGE_CANONICAL_COMMIT_MISSING")
    return this.runtime.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [input.result.coverageVersionId])
      const inserted = await sql.unsafe<Array<{ coverage_version_id: string }>>(
        "INSERT INTO coverage.projection_versions(coverage_version_id,dataset_id,subject,window_start,window_end,source_watermark,source_record_set_digest,status,policy_version_id,computed_at,venue,provider_id,provider_snapshot_ids,input_commit_ids,coverage_checksum) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(coverage_version_id) DO NOTHING RETURNING coverage_version_id",
        [input.result.coverageVersionId,input.result.datasetId,input.result.subject,input.result.windowStart,input.result.windowEnd,input.result.sourceWatermark,input.result.sourceRecordSetDigest,input.result.status,input.result.policyVersionId,input.result.computedAt,input.result.venue,input.result.providerId,input.result.providerSnapshotIds,input.result.inputCommitIds,input.result.coverageChecksum],
      )
      if (inserted.length) return Object.freeze({ status: "CREATED" as const, result: input.result })
      const existing = await sql.unsafe<Array<{ coverage_checksum: string }>>("SELECT coverage_checksum FROM coverage.projection_versions WHERE coverage_version_id=$1", [input.result.coverageVersionId])
      if (existing[0]?.coverage_checksum !== input.result.coverageChecksum) throw new Error("MVP_BOUNDED_COVERAGE_CONFLICT")
      return Object.freeze({ status: "DUPLICATE" as const, result: input.result })
    })
  }

  async readBounded(input: { readonly datasetId: string; readonly venue: string; readonly subject: string; readonly windowStart: string; readonly windowEnd: string }): Promise<MvpBoundedCoverageResult | null> {
    const rows = await this.runtime.sql.unsafe<Array<Record<string, unknown>>>(
      "SELECT * FROM coverage.projection_versions WHERE dataset_id=$1 AND venue=$2 AND subject=$3 AND window_start=$4 AND window_end=$5",
      [input.datasetId,input.venue,input.subject,input.windowStart,input.windowEnd],
    )
    const row = rows[0]
    if (!row) return null
    return Object.freeze({
      coverageVersionId: String(row.coverage_version_id), datasetId: String(row.dataset_id), venue: String(row.venue), subject: String(row.subject),
      windowStart: new Date(String(row.window_start)).toISOString(), windowEnd: new Date(String(row.window_end)).toISOString(), sourceWatermark: new Date(String(row.source_watermark)).toISOString(),
      sourceRecordSetDigest: String(row.source_record_set_digest), status: "AVAILABLE", policyVersionId: String(row.policy_version_id), providerId: String(row.provider_id),
      providerSnapshotIds: Object.freeze([...(row.provider_snapshot_ids as string[])]), inputCommitIds: Object.freeze([...(row.input_commit_ids as string[])]),
      coverageChecksum: String(row.coverage_checksum), computedAt: new Date(String(row.computed_at)).toISOString(),
    })
  }
}
