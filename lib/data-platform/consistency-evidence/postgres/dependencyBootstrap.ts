import { createHash } from "node:crypto"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import type { ConsistencyPostgresRuntime } from "./client"

export const D2_CERTIFIED_BASELINE = "1cb1c8d:d2-canonical-persistence-v2.1"
export const D4_BOOTSTRAP_RUNNER_VERSION = "1.0.0"
export const D2_DEPENDENCY_MIGRATION_ROOT = path.join(process.cwd(), "lib", "data-platform", "persistence", "postgres", "migrations")
export const D2_DEPENDENCY_INVENTORY = Object.freeze([
  { sequence: "001", filename: "001_control_and_raw.sql", checksum: "564f40851b4a36462daababd88ec725908f767897bf697873e846a7d52ed1f9f", certifiedBaseline: D2_CERTIFIED_BASELINE },
  { sequence: "002", filename: "002_repository_lifecycle.sql", checksum: "ef40fddfe0a566bfadf1ac18c1b8fc217c5677ae887bc08cab9d1a1bc10d6cd5", certifiedBaseline: D2_CERTIFIED_BASELINE },
  { sequence: "003", filename: "003_canonical_fact_tables.sql", checksum: "fb6f0c11e349fadab3fa5ae07ee8f0ecd0a860175992962a727e264f7ba34188", certifiedBaseline: D2_CERTIFIED_BASELINE },
  { sequence: "004", filename: "004_governance_and_read_models.sql", checksum: "3466a2ad2728ea905a39d3e539477d2b3e3c215560c6e2598d21f51f63a310ee", certifiedBaseline: D2_CERTIFIED_BASELINE },
  { sequence: "005", filename: "005_funding_event_metadata.sql", checksum: "9919d859b5912df8472a510d9a42262e4b3553130f226973588eea5772c836df", certifiedBaseline: "df94661:d2-funding-event-metadata" },
  { sequence: "006", filename: "006_open_interest_observation_metadata.sql", checksum: "fd68d20cd5c18bef1f1e2191d703979a958bdf6da46a11d0a8c0dd74b2738b48", certifiedBaseline: "344d9e0:d2-open-interest-observation-metadata" },
  { sequence: "007", filename: "007_agg_trade_facts.sql", checksum: "3cfe3df30f032c61f6f8d8897bb3625b9a4ba59716a6a630fa850a735229cb86", certifiedBaseline: "4a6b1cd:d2-aggtrades-segment-storage" },
  { sequence: "008", filename: "008_canonical_stream_segments.sql", checksum: "ef932bb8bd17924e80554728b6707f9c196cf35202e3f39c7ee15a75d84923ba", certifiedBaseline: "4a6b1cd:d2-aggtrades-segment-storage" },
] as const)

export interface D2DependencyArtifact {
  readonly sequence: string
  readonly filename: string
  readonly checksum: string
  readonly certifiedBaseline: string
  readonly sql: string
}
export type DependencyBootstrapResult = { readonly status: "APPLIED" | "SKIPPED" | "FAILED"; readonly sequence: string; readonly filename: string; readonly checksum: string; readonly reason?: string }
const PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/

export function validateDependencyInventory(names: readonly string[]): readonly string[] {
  const errors: string[] = []
  const sequences = new Set<string>()
  for (const name of names) {
    const match = PATTERN.exec(name)
    if (!match) {
      errors.push("MALFORMED_DEPENDENCY_MIGRATION:" + name)
      continue
    }
    if (sequences.has(match[1])) errors.push("DUPLICATE_DEPENDENCY_SEQUENCE:" + match[1])
    sequences.add(match[1])
  }
  if ([...names].sort().join("|") !== names.join("|")) errors.push("DEPENDENCY_ORDER_NOT_DETERMINISTIC")
  return Object.freeze(errors)
}

export async function discoverCertifiedD2Dependencies(root = D2_DEPENDENCY_MIGRATION_ROOT): Promise<readonly D2DependencyArtifact[]> {
  const names = (await readdir(root)).filter((name) => name.endsWith(".sql")).sort()
  const errors = validateDependencyInventory(names)
  if (errors.length) throw new Error(errors.join(","))
  const approved = D2_DEPENDENCY_INVENTORY.map((item) => item.filename)
  if (names.join("|") !== approved.join("|")) throw new Error("D2_DEPENDENCY_INVENTORY_MISMATCH")
  const artifacts: D2DependencyArtifact[] = []
  for (const expected of D2_DEPENDENCY_INVENTORY) {
    const sql = await readFile(path.join(root, expected.filename), "utf8")
    const checksum = createHash("sha256").update(sql).digest("hex")
    if (checksum !== expected.checksum) throw new Error("D2_CERTIFIED_CHECKSUM_DRIFT:" + expected.filename)
    artifacts.push(Object.freeze({ sequence: expected.sequence, filename: expected.filename, checksum, certifiedBaseline: expected.certifiedBaseline, sql }))
  }
  return Object.freeze(artifacts)
}

async function ensureBootstrapLedger(runtime: ConsistencyPostgresRuntime): Promise<void> {
  await runtime.transaction(async (sql) => {
    await sql.unsafe("CREATE SCHEMA IF NOT EXISTS d4_control")
    await sql.unsafe("CREATE TABLE IF NOT EXISTS d4_control.dependency_bootstrap_ledger (dependency_owner text NOT NULL CHECK (dependency_owner='D2'), certified_baseline text NOT NULL, source_filename text NOT NULL, sequence text NOT NULL, source_checksum text NOT NULL CHECK (source_checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL, target_database text NOT NULL CHECK (target_database='quantterminal_d4_isolated'), bootstrap_runner_version text NOT NULL, status text NOT NULL CHECK (status='APPLIED'), PRIMARY KEY (dependency_owner,sequence), UNIQUE (dependency_owner,source_filename))")
  })
}

async function verifyCompatibleHistory(runtime: ConsistencyPostgresRuntime, artifacts: readonly D2DependencyArtifact[]): Promise<void> {
  const rows = await runtime.sql.unsafe<{ readonly sequence: string; readonly source_filename: string; readonly source_checksum: string; readonly certified_baseline: string; readonly status: string }[]>("SELECT sequence,source_filename,source_checksum,certified_baseline,status FROM d4_control.dependency_bootstrap_ledger WHERE dependency_owner='D2' ORDER BY sequence")
  if (rows.length > artifacts.length) throw new Error("AMBIGUOUS_D2_BOOTSTRAP_HISTORY")
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]
    const expected = artifacts[index]
    if (!expected || row.sequence !== expected.sequence || row.source_filename !== expected.filename || row.source_checksum !== expected.checksum || row.certified_baseline !== expected.certifiedBaseline || row.status !== "APPLIED") throw new Error("D2_BOOTSTRAP_HISTORY_MISMATCH")
  }
  if (!rows.length) {
    const objects = await runtime.sql.unsafe<{ readonly commits: string | null; readonly versions: string | null }[]>("SELECT to_regclass('control.canonical_commits')::text commits,to_regclass('repository.record_versions')::text versions")
    if (objects[0]?.commits || objects[0]?.versions) throw new Error("UNLEDGERED_D2_FOUNDATION")
  }
}

export class D2DependencyBootstrapRunner {
  constructor(private readonly runtime: ConsistencyPostgresRuntime, private readonly migrationRoot = D2_DEPENDENCY_MIGRATION_ROOT) {}
  async apply(appliedBy: string): Promise<readonly DependencyBootstrapResult[]> {
    if (this.runtime.roleIntent !== "MIGRATION_OWNER" || !appliedBy.trim()) throw new Error("D2_DEPENDENCY_BOOTSTRAP_AUTHORIZATION_REQUIRED")
    const artifacts = await discoverCertifiedD2Dependencies(this.migrationRoot)
    await ensureBootstrapLedger(this.runtime)
    await verifyCompatibleHistory(this.runtime, artifacts)
    const results: DependencyBootstrapResult[] = []
    for (const artifact of artifacts) {
      try {
        const existing = await this.runtime.sql.unsafe<{ readonly source_checksum: string; readonly certified_baseline: string }[]>("SELECT source_checksum,certified_baseline FROM d4_control.dependency_bootstrap_ledger WHERE dependency_owner='D2' AND sequence=$1", [artifact.sequence])
        if (existing[0]) {
          if (existing[0].source_checksum !== artifact.checksum || existing[0].certified_baseline !== artifact.certifiedBaseline) throw new Error("D2_DEPENDENCY_LEDGER_MISMATCH")
          results.push({ status: "SKIPPED", sequence: artifact.sequence, filename: artifact.filename, checksum: artifact.checksum })
          continue
        }
        await this.runtime.transaction(async (sql) => {
          await sql.unsafe(artifact.sql)
          await sql.unsafe("INSERT INTO d4_control.dependency_bootstrap_ledger(dependency_owner,certified_baseline,source_filename,sequence,source_checksum,applied_at,target_database,bootstrap_runner_version,status) VALUES('D2',$1,$2,$3,$4,now(),'quantterminal_d4_isolated',$5,'APPLIED')", [artifact.certifiedBaseline, artifact.filename, artifact.sequence, artifact.checksum, D4_BOOTSTRAP_RUNNER_VERSION])
        })
        results.push({ status: "APPLIED", sequence: artifact.sequence, filename: artifact.filename, checksum: artifact.checksum })
      } catch (cause) {
        results.push({ status: "FAILED", sequence: artifact.sequence, filename: artifact.filename, checksum: artifact.checksum, reason: cause instanceof Error ? cause.message : "UNKNOWN_D2_DEPENDENCY_BOOTSTRAP_FAILURE" })
        break
      }
    }
    return Object.freeze(results)
  }
}

export async function verifyD2Foundation(runtime: ConsistencyPostgresRuntime): Promise<boolean> {
  const objects = await runtime.sql.unsafe<{ readonly commits: string | null; readonly versions: string | null; readonly state_type: string | null; readonly ledger: string | null; readonly d3: boolean }[]>("SELECT to_regclass('control.canonical_commits')::text commits,to_regclass('repository.record_versions')::text versions,to_regtype('repository.publication_state')::text state_type,to_regclass('d4_control.dependency_bootstrap_ledger')::text ledger,EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name='population') d3")
  if (!objects[0]?.commits || !objects[0]?.versions || !objects[0]?.state_type || !objects[0]?.ledger || objects[0]?.d3) return false
  const ledger = await runtime.sql.unsafe<{ readonly count: number }[]>("SELECT count(*)::int count FROM d4_control.dependency_bootstrap_ledger WHERE dependency_owner='D2' AND status='APPLIED'")
  return ledger[0]?.count === D2_DEPENDENCY_INVENTORY.length
}
