import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { verifyMvpProjection, type MvpProjectionDefinition, type MvpProjectionKind, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type { ConsistencyPostgresRuntime } from "./client"

export type MvpProjectionWriteOutcome =
  | { readonly status: "CREATED" | "DUPLICATE"; readonly projection: MvpProjectionVersion }
  | { readonly status: "CONFLICT"; readonly projectionVersionId: string }

export class MvpProjectionStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime) {
    if (runtime.roleIntent !== "PROJECTION_BUILDER") throw new Error("PROJECTION_BUILDER_ROLE_REQUIRED")
  }
  async write(projection: MvpProjectionVersion): Promise<MvpProjectionWriteOutcome> {
    if (!verifyMvpProjection(projection)) throw new Error("MVP_PROJECTION_CHECKSUM_INVALID")
    return this.runtime.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [projection.projectionVersionIdentity])
      const existing = await sql.unsafe<{ projection_version_id: string; projection_checksum: string }[]>("SELECT projection_version_id,projection_checksum FROM projection.mvp_projection_versions WHERE projection_version_identity=$1", [projection.projectionVersionIdentity])
      if (existing[0]) {
        if (existing[0].projection_checksum === projection.projectionChecksum) return { status: "DUPLICATE", projection }
        const conflictId = `mvpcf_${canonicalChecksum({ identity: projection.projectionVersionIdentity, existing: existing[0].projection_checksum, incoming: projection.projectionChecksum })}`
        await sql.unsafe("INSERT INTO projection.mvp_projection_conflicts VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING", [conflictId, projection.projectionVersionIdentity, existing[0].projection_version_id, existing[0].projection_checksum, projection.projectionChecksum, projection.createdAt, "IMMUTABLE_PROJECTION_CONTENT_MISMATCH"])
        return { status: "CONFLICT", projectionVersionId: existing[0].projection_version_id }
      }
      await sql.unsafe("INSERT INTO projection.mvp_projection_versions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::text::jsonb,$14,$15,$16,$17,$18,$19,$20)", [projection.projectionVersionId, projection.projectionVersionIdentity, projection.projectionId, projection.projectionKind, projection.subjectId, projection.eventTimeStart, projection.eventTimeEnd, projection.knowledgeTimeCutoff, projection.dependencyDigest, projection.generatorId, projection.generatorVersion, projection.schemaVersion, JSON.stringify(projection.structuredPayload), projection.completeness, projection.limitations, projection.lifecycleState, projection.consumerExposureState, projection.supersedesProjectionVersionId, projection.projectionChecksum, projection.createdAt])
      for (const dependency of projection.dependencies) await sql.unsafe("INSERT INTO projection.mvp_projection_dependencies VALUES($1,$2,$3,$4,$5)", [projection.projectionVersionId, dependency.dependencyType, dependency.dependencyId, dependency.dependencyVersion ?? "", dependency.dependencyChecksum])
      return { status: "CREATED", projection }
    })
  }
}

export class MvpProjectionReadPort {
  constructor(private readonly runtime: ConsistencyPostgresRuntime) {
    if (runtime.roleIntent !== "READ_ONLY") throw new Error("READ_ONLY_ROLE_REQUIRED")
  }
  async byVersion(projectionVersionId: string): Promise<MvpProjectionVersion | null> {
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM projection.mvp_projection_versions WHERE projection_version_id=$1", [projectionVersionId])
    return rows[0] ? this.map(rows[0]) : null
  }
  async list(input: { readonly kind?: MvpProjectionKind; readonly subjectId?: string; readonly start?: string; readonly end?: string; readonly exposure?: "INTERNAL_ONLY" | "READY_FOR_CUTOVER"; readonly limit: number; readonly offset?: number }): Promise<readonly MvpProjectionVersion[]> {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new Error("MVP_PROJECTION_PAGE_LIMIT_INVALID")
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM projection.mvp_projection_versions WHERE ($1::text IS NULL OR projection_kind=$1) AND ($2::text IS NULL OR subject_id=$2) AND ($3::timestamptz IS NULL OR event_time_start >= $3) AND ($4::timestamptz IS NULL OR event_time_end <= $4) AND ($5::text IS NULL OR consumer_exposure_state=$5) ORDER BY event_time_start,subject_id,projection_version_id LIMIT $6 OFFSET $7", [input.kind ?? null, input.subjectId ?? null, input.start ?? null, input.end ?? null, input.exposure ?? null, input.limit, input.offset ?? 0])
    return Object.freeze(await Promise.all(rows.map((row) => this.map(row))))
  }
  async latest(kind: MvpProjectionKind, subjectId: string): Promise<MvpProjectionVersion | null> {
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM projection.mvp_projection_versions WHERE projection_kind=$1 AND subject_id=$2 AND lifecycle_state='GENERATED' AND consumer_exposure_state='READY_FOR_CUTOVER' ORDER BY event_time_end DESC,created_at DESC,projection_version_id DESC LIMIT 1", [kind, subjectId])
    return rows[0] ? this.map(rows[0]) : null
  }
  async dependencies(projectionVersionId: string): Promise<readonly Record<string, unknown>[]> {
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT dependency_type,dependency_id,NULLIF(dependency_version,'') dependency_version,dependency_checksum FROM projection.mvp_projection_dependencies WHERE projection_version_id=$1 ORDER BY dependency_type,dependency_id,dependency_version", [projectionVersionId])
    return Object.freeze(rows.map((row) => Object.freeze(row)))
  }
  private async map(row: Record<string, unknown>): Promise<MvpProjectionVersion> {
    const dependencies = await this.dependencies(String(row.projection_version_id))
    const value = Object.freeze({ projectionId: String(row.projection_id), projectionVersionId: String(row.projection_version_id), projectionVersionIdentity: String(row.projection_version_identity), projectionKind: String(row.projection_kind) as MvpProjectionKind, subjectId: String(row.subject_id), eventTimeStart: new Date(String(row.event_time_start)).toISOString(), eventTimeEnd: new Date(String(row.event_time_end)).toISOString(), knowledgeTimeCutoff: new Date(String(row.knowledge_time_cutoff)).toISOString(), dependencyDigest: String(row.dependency_digest), generatorId: String(row.generator_id) as MvpProjectionVersion["generatorId"], generatorVersion: String(row.generator_version) as MvpProjectionVersion["generatorVersion"], schemaVersion: String(row.schema_version) as "1.0.0", structuredPayload: row.structured_payload as Readonly<Record<string, unknown>>, completeness: String(row.completeness) as MvpProjectionVersion["completeness"], limitations: Object.freeze((row.limitations as string[]) ?? []), lifecycleState: String(row.lifecycle_state) as MvpProjectionVersion["lifecycleState"], consumerExposureState: String(row.consumer_exposure_state) as MvpProjectionVersion["consumerExposureState"], supersedesProjectionVersionId: row.supersedes_projection_version_id ? String(row.supersedes_projection_version_id) : null, dependencies: dependencies.map((item) => Object.freeze({ dependencyType: String(item.dependency_type) as MvpProjectionVersion["dependencies"][number]["dependencyType"], dependencyId: String(item.dependency_id), dependencyVersion: item.dependency_version ? String(item.dependency_version) : null, dependencyChecksum: item.dependency_checksum ? String(item.dependency_checksum) : null })), projectionChecksum: String(row.projection_checksum), createdAt: new Date(String(row.created_at)).toISOString() })
    if (!verifyMvpProjection(value)) throw new Error("MVP_PROJECTION_PERSISTED_CHECKSUM_INVALID")
    return value
  }
}

export async function seedMvpProjectionDefinitions(runtime: ConsistencyPostgresRuntime, definitions: readonly MvpProjectionDefinition[]): Promise<void> {
  if (runtime.roleIntent !== "MIGRATION_OWNER") throw new Error("MIGRATION_OWNER_ROLE_REQUIRED")
  for (const definition of definitions) await runtime.sql.unsafe("INSERT INTO projection.mvp_projection_definitions VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING", [definition.projectionKind, definition.consumer, definition.schemaVersion, definition.generatorId, definition.generatorVersion, definition.definitionChecksum, "2026-07-12T00:00:00.000Z"])
  const rows = await runtime.sql.unsafe<Array<{ projection_kind: string; consumer: string; schema_version: string; generator_id: string; generator_version: string; definition_checksum: string }>>("SELECT projection_kind,consumer,schema_version,generator_id,generator_version,definition_checksum FROM projection.mvp_projection_definitions WHERE projection_kind=ANY($1) ORDER BY projection_kind", [definitions.map((value) => value.projectionKind)])
  const stored = new Map(rows.map((row) => [row.projection_kind, row]))
  if (rows.length !== definitions.length || definitions.some((definition) => {
    const row = stored.get(definition.projectionKind)
    return !row || row.consumer !== definition.consumer || row.schema_version !== definition.schemaVersion || row.generator_id !== definition.generatorId || row.generator_version !== definition.generatorVersion || row.definition_checksum !== definition.definitionChecksum
  })) throw new Error("MVP_PROJECTION_DEFINITION_INVENTORY_MISMATCH")
}
