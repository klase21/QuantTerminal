import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  DOWNSTREAM_BOUNDARY_MAP,
  DOWNSTREAM_CERTIFICATION_STAGES,
  executeDownstreamCertificationPass,
  type DownstreamCertificationStage,
} from "@/lib/data-platform/mvp-refresh"

interface Row { checksum: string; parent_identity: string | null }

function memorySql(tables: Map<string, Map<string, Row>>) {
  return Object.freeze({
    async unsafe<T>(query: string, parameters: readonly unknown[] = []): Promise<T> {
      const select = query.match(/^SELECT checksum,parent_identity FROM ([a-z_]+) WHERE identity=\$1$/)
      if (select) {
        const row = tables.get(select[1]!)?.get(String(parameters[0]))
        return (row ? [{ checksum: row.checksum, parent_identity: row.parent_identity }] : []) as T
      }
      const insert = query.match(/^INSERT INTO ([a-z_]+)(?:\([^)]*\))? VALUES/)
      if (insert) {
        const table = tables.get(insert[1]!) ?? new Map<string, Row>()
        const identity = String(parameters[0]), checksum = String(parameters[1]), parent = String(parameters[2])
        if (table.has(identity)) throw new Error("TEST_DUPLICATE_PRIMARY_KEY")
        table.set(identity, { checksum, parent_identity: parent }); tables.set(insert[1]!, table)
        return [] as T
      }
      throw new Error(`TEST_SQL_UNSUPPORTED:${query}`)
    },
  })
}

async function main(): Promise<void> {
  assert.deepEqual(DOWNSTREAM_CERTIFICATION_STAGES, ["CANONICAL_COMMIT", "COVERAGE", "CONSISTENCY", "EVIDENCE", "PROJECTION", "REPLAY", "DATASET_WATERMARK", "COMMON_WATERMARK", "CANDIDATE_MANIFEST"])
  assert.equal(DOWNSTREAM_BOUNDARY_MAP.length, DOWNSTREAM_CERTIFICATION_STAGES.length)
  assert.equal(DOWNSTREAM_BOUNDARY_MAP.some((value) => value.externalLineage.length > 0), true)
  assert.equal(DOWNSTREAM_BOUNDARY_MAP.every((value) => value.idempotencyKey && value.checkpoint && value.resumeBoundary), true)

  const tables = new Map<string, Map<string, Row>>()
  const d2 = memorySql(tables), d4 = memorySql(tables), refresh = memorySql(tables), serving = memorySql(tables)
  const context = { d2, d4, refresh, serving, candidate: { identity: "candidate:persisted", checksum: canonicalChecksum({ candidate: "persisted" }) }, certificationId: canonicalChecksum({ certification: "unit" }) }
  const first = await executeDownstreamCertificationPass(context as never)
  const second = await executeDownstreamCertificationPass(context as never)
  assert.equal(first.length, 9)
  assert.equal(first.every((value) => value.status === "CREATED"), true)
  assert.equal(second.every((value) => value.status === "DUPLICATE"), true)
  assert.deepEqual(first.map((value) => [value.identity, value.checksum]), second.map((value) => [value.identity, value.checksum]))

  const failureTables = new Map<string, Map<string, Row>>()
  const failureSql = memorySql(failureTables)
  await assert.rejects(() => executeDownstreamCertificationPass({ ...context, d2: failureSql, d4: failureSql, refresh: failureSql, serving: failureSql, certificationId: canonicalChecksum({ certification: "failure" }) } as never, "CONSISTENCY"), /DOWNSTREAM_CERTIFICATION_INJECTED_FAILURE:CONSISTENCY/)
  const retainedStages = [...failureTables.values()].reduce((sum, value) => sum + value.size, 0)
  assert.equal(retainedStages, 3)
  assert.equal([...failureTables.keys()].some((name) => ["mvp_cert_evidence", "mvp_cert_projection", "mvp_cert_replay", "mvp_cert_dataset_watermark", "mvp_cert_common_watermark", "mvp_cert_manifest"].includes(name)), false)

  const conflictTables = new Map(tables)
  const fact = conflictTables.get("mvp_cert_fact")!
  const [identity, row] = [...fact.entries()][0]!
  fact.set(identity, { ...row, checksum: canonicalChecksum({ conflict: true }) })
  await assert.rejects(() => executeDownstreamCertificationPass({ ...context, d2: memorySql(conflictTables), d4: memorySql(conflictTables), refresh: memorySql(conflictTables), serving: memorySql(conflictTables) } as never), /DOWNSTREAM_CERTIFICATION_IMMUTABLE_CONFLICT/)

  const localParents = DOWNSTREAM_BOUNDARY_MAP.filter((value) => value.localParent && value.localParent !== "PERSISTED_D3_CANDIDATE")
  assert.equal(localParents.every((value) => DOWNSTREAM_BOUNDARY_MAP.find((parent) => parent.stage === value.localParent)?.physicalOwner === value.physicalOwner), true)
  assert.equal(DOWNSTREAM_BOUNDARY_MAP.filter((value) => value.localParent === null).every((value) => value.externalLineage.length > 0), true)
  console.log(JSON.stringify({ passed: true, stages: 9, exactRepeat: "DUPLICATE", failureBlockedAt: "CONSISTENCY", downstreamAfterFailure: 0 }))
}

void main().catch((error) => { console.error(error); process.exitCode = 1 })
