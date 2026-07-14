import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  MVP_EVIDENCE_RULES,
  MVP_EVIDENCE_RULE_SET_ID,
  MVP_EVIDENCE_RULE_SET_VERSION,
  MVP_EVIDENCE_SYMBOLS,
  TemporalAlignmentRuntime,
  createConsistencyRunSpecification,
  createImmutableConsistencyResult,
  createMvpMarketAssessment,
  readMvpEvidenceWindows,
  type AvailableTemporalAlignmentInput,
  type ConsistencyResult,
  type MvpMarketAssessment,
  type MvpRuleEvaluation,
  type TemporalAlignmentPolicy,
} from "@/lib/data-platform/consistency"
import {
  ConsistencyMigrationRunner,
  ConsistencyPostgresRuntime,
  ConsistencyResultStore,
  ConsistencyRunStore,
  CoreEvidenceStore,
  D2DependencyBootstrapRunner,
  MvpEvidenceAssessmentStore,
  type D4Environment,
} from "@/lib/data-platform/consistency-evidence/postgres"
import type { EvidenceAssemblyProfile } from "@/lib/data-platform/evidence-platform"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"

const CORPUS_PATH = path.join(process.cwd(), "docs", "project", "mvp-recent-market-corpus-manifest.json")
const OUTPUT_PATH = path.join(process.cwd(), "docs", "project", "mvp-evidence-corpus.json")
const POLICY = Object.freeze({ temporal: "mvp-evidence-temporal/1.0.0", comparison: "mvp-evidence-comparison/1.0.0", severity: "mvp-evidence-severity/1.0.0", activation: "mvp-evidence-activation/1.0.0" })
const RULE_REGISTRY_CHECKSUM = canonicalChecksum(MVP_EVIDENCE_RULES)

const PROFILE: EvidenceAssemblyProfile = Object.freeze({
  profileId: "MVP-MARKET-STATE-CORE-EVIDENCE", profileVersion: "1.0.0", schemaVersion: "1",
  assemblyPolicyId: POLICY.activation, assemblyPolicyVersion: "1.0.0",
  selectionPolicyReferences: Object.freeze([{ policyId: POLICY.comparison, policyVersion: "1.0.0" }]),
  conclusionPolicyId: POLICY.activation, conclusionPolicyVersion: "1.0.0",
  roleRules: Object.freeze(MVP_EVIDENCE_RULES.flatMap((rule) => [
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["CONSISTENT"] as const), role: "SUPPORTING" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["INCONSISTENT"] as const), role: "CONFLICTING" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["PARTIAL", "INDETERMINATE", "NOT_APPLICABLE"] as const), role: "CONTEXTUAL" as const },
    { ruleId: rule.ruleId, ruleVersion: rule.ruleVersion, outcomes: Object.freeze(["BLOCKED_MISSING_INPUT", "BLOCKED_INVALID_INPUT", "BLOCKED_SUPERSEDED_INPUT", "BLOCKED_FUTURE_KNOWLEDGE"] as const), role: "BLOCKING" as const },
  ])), requiredRoles: Object.freeze([]), optionalRoles: Object.freeze(["SUPPORTING", "CONFLICTING", "CONTEXTUAL", "BLOCKING"] as const),
})

interface CorpusManifest { readonly corpusId: string; readonly corpusChecksum: string }
type Command = "evaluate" | "recompute" | "status" | "inspect" | "verify"

function environment(): D4Environment {
  return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL }
}
function runtime(roleIntent: "MIGRATION_OWNER" | "CONSISTENCY_WORKER" | "EVIDENCE_ASSEMBLER" | "READ_ONLY", applicationName: string) {
  const env = environment(), connectionString = env.D4_ISOLATED_POSTGRES_URL
  if (!connectionString) throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED")
  return new ConsistencyPostgresRuntime({ connectionString, roleIntent, maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, statementTimeoutMs: 30_000, applicationName, environment: env })
}
function temporalPolicy(): TemporalAlignmentPolicy {
  return Object.freeze({ policyId: POLICY.temporal, policyVersion: "1.0.0", mode: "WINDOW_CONTAINMENT", noLookahead: true, boundary: "START_INCLUSIVE_END_EXCLUSIVE", maximumGapMs: null, nearestDirection: "PRIOR_ONLY", tieBreak: "LOWEST_CANONICAL_ID", missingBehavior: "BLOCK", unsupportedBehavior: "BLOCK", allowMultipleWindowMappings: true, interpolationAllowed: false, forwardFillAllowed: false, aggregationPolicy: null, resolutionPolicy: { policyId: POLICY.comparison, policyVersion: "1.0.0" }, cadencePolicy: { policyId: POLICY.comparison, policyVersion: "1.0.0" }, eligiblePublicationStates: ["PENDING", "CERTIFIED", "PUBLISHED"] as const, diagnosticsSchemaVersion: "mvp-evidence-diagnostics/1.0.0" })
}
async function seedGovernance(owner: ConsistencyPostgresRuntime): Promise<readonly string[]> {
  const dependencies = await new D2DependencyBootstrapRunner(owner).apply("mvp-2-d2-dependency-alignment")
  if (dependencies.some((item) => item.status === "FAILED")) throw new Error(`D2_DEPENDENCY_BOOTSTRAP_FAILED:${JSON.stringify(dependencies)}`)
  const migrations = await new ConsistencyMigrationRunner(owner).apply("mvp-2-evidence-activation")
  if (migrations.some((item) => item.status === "FAILED")) throw new Error(`D4_MIGRATION_FAILED:${JSON.stringify(migrations)}`)
  const createdAt = "2026-07-12T00:00:00.000Z"
  const misplaced = await owner.sql.unsafe<Array<{ rule_count: number; run_count: number; result_count: number }>>("SELECT (SELECT count(*)::int FROM consistency.rules WHERE rule_set_id='mvp-market-evidence' AND rule_id=ANY($1)) rule_count,(SELECT count(*)::int FROM consistency.run_specifications WHERE rule_set_id='mvp-market-evidence') run_count,(SELECT count(*)::int FROM consistency.immutable_results WHERE rule_set_id='mvp-market-evidence') result_count", [MVP_EVIDENCE_RULES.map((rule) => rule.ruleId)])
  if (misplaced[0]?.rule_count) {
    if (misplaced[0].run_count || misplaced[0].result_count || misplaced[0].rule_count !== MVP_EVIDENCE_RULES.length) throw new Error("MVP_EVIDENCE_MISPLACED_REGISTRY_ROWS_NOT_SAFE_TO_REMEDIATE")
    await owner.transaction(async (sql) => {
      await sql.unsafe("ALTER TABLE consistency.rules DISABLE TRIGGER USER")
      await sql.unsafe("ALTER TABLE consistency.rule_sets DISABLE TRIGGER USER")
      try {
        await sql.unsafe("DELETE FROM consistency.rules WHERE rule_set_id='mvp-market-evidence' AND rule_id=ANY($1)", [MVP_EVIDENCE_RULES.map((rule) => rule.ruleId)])
        await sql.unsafe("DELETE FROM consistency.rule_sets WHERE rule_set_id='mvp-market-evidence' AND rule_set_version=$1", [MVP_EVIDENCE_RULE_SET_VERSION])
      } finally {
        await sql.unsafe("ALTER TABLE consistency.rules ENABLE TRIGGER USER")
        await sql.unsafe("ALTER TABLE consistency.rule_sets ENABLE TRIGGER USER")
      }
    })
  }
  const misplacedProfile = await owner.sql.unsafe<Array<{ profile_count: number; packet_count: number }>>("SELECT (SELECT count(*)::int FROM evidence.core_assembly_profiles WHERE profile_id='mvp-market-state-core-evidence' AND profile_version=$1) profile_count,(SELECT count(*)::int FROM evidence.core_packet_identities WHERE profile_id='mvp-market-state-core-evidence' AND profile_version=$1) packet_count", [PROFILE.profileVersion])
  if (misplacedProfile[0]?.profile_count) {
    if (misplacedProfile[0].packet_count || misplacedProfile[0].profile_count !== 1) throw new Error("MVP_EVIDENCE_MISPLACED_PROFILE_NOT_SAFE_TO_REMEDIATE")
    await owner.transaction(async (sql) => {
      await sql.unsafe("ALTER TABLE evidence.core_assembly_profiles DISABLE TRIGGER USER")
      try { await sql.unsafe("DELETE FROM evidence.core_assembly_profiles WHERE profile_id='mvp-market-state-core-evidence' AND profile_version=$1", [PROFILE.profileVersion]) }
      finally { await sql.unsafe("ALTER TABLE evidence.core_assembly_profiles ENABLE TRIGGER USER") }
    })
  }
  for (const [policyVersionId, datasetId] of [[POLICY.temporal, "mvp-evidence-temporal"], [POLICY.comparison, "mvp-evidence-comparison"], [POLICY.severity, "mvp-evidence-severity"], [POLICY.activation, "mvp-evidence-activation"]] as const) {
    const content = { policyVersionId, datasetId, version: "1.0.0", failClosed: true }
    await owner.sql.unsafe("INSERT INTO control.policy_versions VALUES($1,$2,$3,$4,$5::text::jsonb,$6,$6) ON CONFLICT DO NOTHING", [policyVersionId, datasetId, "1.0.0", canonicalChecksum(content), JSON.stringify(content), createdAt])
  }
  await owner.sql.unsafe("INSERT INTO consistency.rule_sets VALUES($1,$2,$3,'APPROVED',$4,$5) ON CONFLICT DO NOTHING", [MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, POLICY.activation, RULE_REGISTRY_CHECKSUM, createdAt])
  for (const rule of MVP_EVIDENCE_RULES) await owner.sql.unsafe("INSERT INTO consistency.rules VALUES($1,$2,$3,$4,'DIRECTIONAL_AGREEMENT','CONTEXTUAL',$5,$6,'ADVISORY',$7,$8) ON CONFLICT DO NOTHING", [rule.ruleId, rule.ruleVersion, MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, "mvp-evidence-diagnostics/1.0.0", POLICY.activation, canonicalChecksum(rule), createdAt])
  await owner.sql.unsafe("INSERT INTO evidence.core_assembly_profiles VALUES($1,$2,$3,$4,$5,$6::text::jsonb,$7,$8,$9::text::jsonb,$10,$11,$12,$13) ON CONFLICT DO NOTHING", [PROFILE.profileId, PROFILE.profileVersion, PROFILE.schemaVersion, PROFILE.assemblyPolicyId, PROFILE.assemblyPolicyVersion, JSON.stringify(PROFILE.selectionPolicyReferences), PROFILE.conclusionPolicyId, PROFILE.conclusionPolicyVersion, JSON.stringify(PROFILE.roleRules), PROFILE.requiredRoles, PROFILE.optionalRoles, canonicalChecksum(PROFILE), createdAt])
  const checks = await owner.sql.unsafe<Array<{ rule_count: number; profile_count: number; policy_count: number }>>("SELECT (SELECT count(*)::int FROM consistency.rules WHERE rule_set_id=$1 AND rule_set_version=$2) rule_count,(SELECT count(*)::int FROM evidence.core_assembly_profiles WHERE profile_id=$3 AND profile_version=$4 AND definition_checksum=$5) profile_count,(SELECT count(*)::int FROM control.policy_versions WHERE policy_version_id=ANY($6)) policy_count", [MVP_EVIDENCE_RULE_SET_ID, MVP_EVIDENCE_RULE_SET_VERSION, PROFILE.profileId, PROFILE.profileVersion, canonicalChecksum(PROFILE), Object.values(POLICY)])
  if (checks[0]?.rule_count !== 5 || checks[0]?.profile_count !== 1 || checks[0]?.policy_count !== 4) throw new Error("MVP_EVIDENCE_GOVERNANCE_BINDING_FAILED")
  return Object.freeze([...dependencies.map((item) => `D2-${item.sequence}:${item.status}`), ...migrations.map((item) => `D4-${item.migrationId}:${item.status}`)])
}
function outcome(evaluation: MvpRuleEvaluation): "CONSISTENT" | "INCONSISTENT" | "BLOCKED_MISSING_INPUT" { return evaluation.state === "TRIGGERED" ? "CONSISTENT" : evaluation.state === "NOT_TRIGGERED" ? "INCONSISTENT" : "BLOCKED_MISSING_INPUT" }
function diagnostic(evaluation: MvpRuleEvaluation, assessment: MvpMarketAssessment) {
  const values = [
    { name: "marketState", value: assessment.marketState, unit: null },
    { name: "measurementDigest", value: evaluation.measurementDigest, unit: null },
    { name: "supportingCodes", value: evaluation.supportingCodes.join(",") || "NONE", unit: null },
    { name: "counterEvidenceCodes", value: evaluation.counterEvidenceCodes.join(",") || "NONE", unit: null },
    { name: "nonTriggerCodes", value: evaluation.nonTriggerCodes.join(",") || "NONE", unit: null },
  ]
  return Object.freeze({ diagnosticId: `mvp_diag_${canonicalChecksum({ assessment: assessment.assessmentIdentity, rule: evaluation.ruleId })}`, code: evaluation.state, schemaVersion: "mvp-evidence-diagnostics/1.0.0", inputRoleIds: Object.freeze([]), boundedValues: Object.freeze(values), explanationCode: evaluation.ruleId })
}
function completionSummary(runId: string, evaluations: readonly MvpRuleEvaluation[]) {
  const consistent = evaluations.filter((item) => item.state === "TRIGGERED").length, blocked = evaluations.filter((item) => item.state === "NOT_EVALUABLE").length
  const base = { summaryId: `mvp_summary_${canonicalChecksum({ runId, evaluations: evaluations.map((item) => item.state) })}`, runId, requiredRuleCount: evaluations.length, completedRuleCount: evaluations.length, consistentResultCount: consistent, inconsistentResultCount: evaluations.length - consistent - blocked, blockedResultCount: blocked, failedEvaluationCount: 0, unresolvedCount: 0, terminalState: "COMPLETED" as const, reasonCodes: Object.freeze([] as string[]) }
  return Object.freeze({ ...base, summaryChecksum: canonicalChecksum(base) })
}

async function persistWindow(input: { readonly corpus: CorpusManifest; readonly data: Awaited<ReturnType<typeof readMvpEvidenceWindows>>[number]; readonly worker: ConsistencyPostgresRuntime; readonly assembler: ConsistencyPostgresRuntime }) {
  const assessment = createMvpMarketAssessment({ corpusId: input.corpus.corpusId, corpusChecksum: input.corpus.corpusChecksum, measurement: input.data.measurement })
  const policies = { temporalPolicyId: POLICY.temporal, temporalPolicyVersion: "1.0.0", comparisonPolicyReferences: [{ policyId: POLICY.comparison, policyVersion: "1.0.0" }], severityPolicyId: POLICY.severity, severityPolicyVersion: "1.0.0", retryPolicyReference: null }
  const spec = createConsistencyRunSpecification({ ruleSetId: MVP_EVIDENCE_RULE_SET_ID, ruleSetVersion: MVP_EVIDENCE_RULE_SET_VERSION, subjectId: assessment.instrument, eventTimeStart: assessment.eventTimeStart, eventTimeEnd: assessment.eventTimeEnd, knowledgeMode: "RETROSPECTIVE", knowledgeTimeCutoff: assessment.knowledgeTimeCutoff, orderedInputs: input.data.runInputs, ruleRegistryChecksum: RULE_REGISTRY_CHECKSUM, policyBindings: policies, executionProfile: "mvp-bounded-corpus", createdAt: assessment.createdAt })
  const runStore = new ConsistencyRunStore(input.worker), resultStore = new ConsistencyResultStore(input.worker)
  const created = await runStore.create(spec)
  if (created.status === "CONFLICT") throw new Error(`MVP_EVIDENCE_RUN_CONFLICT:${spec.runId}`)
  if (created.run.currentState === "PENDING") {
    const transition = await runStore.transition({ commandId: `start:${spec.runId}`, runId: spec.runId, specificationChecksum: spec.specificationChecksum, nextState: "RUNNING", actorType: "WORKER", actorId: "mvp-evidence-worker", occurredAt: assessment.createdAt, policyVersionReferences: Object.values(POLICY), reasonCodes: [], details: [], completionSummary: null })
    if (transition.status === "REJECTED") throw new Error(`MVP_EVIDENCE_RUN_START_REJECTED:${transition.failure}`)
  }
  const alignment = new TemporalAlignmentRuntime().align({ runSpecification: spec, policy: temporalPolicy(), eventTimeWindow: { start: assessment.eventTimeStart, end: assessment.eventTimeEnd }, knowledgeTime: { mode: "RETROSPECTIVE", cutoff: assessment.knowledgeTimeCutoff }, targetEventTime: null, inputs: input.data.temporalInputs, createdAt: assessment.createdAt })
  if (alignment.status !== "MATCHED") throw new Error(`MVP_EVIDENCE_ALIGNMENT_${alignment.status}`)
  const results: ConsistencyResult[] = []
  const resultStatuses: string[] = []
  for (const evaluation of assessment.ruleEvaluations) {
    const write = await resultStore.write({ runSpecification: spec, alignment, ruleId: evaluation.ruleId, ruleVersion: evaluation.ruleVersion, diagnosticSchemaVersion: "mvp-evidence-diagnostics/1.0.0", inputs: input.data.resultInputs, outcome: outcome(evaluation), severity: "ADVISORY", blocking: evaluation.state === "NOT_EVALUABLE", diagnostics: [diagnostic(evaluation, assessment)], policyBindings: policies, schemaVersion: "1", createdAt: assessment.createdAt })
    if (write.status !== "CREATED" && write.status !== "DUPLICATE" && write.status !== "REUSED") throw new Error(`MVP_EVIDENCE_RESULT_${write.status}`)
    results.push(write.result); resultStatuses.push(write.status)
  }
  const current = await runStore.read(spec.runId)
  if (current.currentState === "RUNNING") {
    const transition = await runStore.transition({ commandId: `complete:${spec.runId}`, runId: spec.runId, specificationChecksum: spec.specificationChecksum, nextState: "COMPLETED", actorType: "WORKER", actorId: "mvp-evidence-worker", occurredAt: assessment.createdAt, policyVersionReferences: Object.values(POLICY), reasonCodes: [], details: [], completionSummary: completionSummary(spec.runId, assessment.ruleEvaluations) })
    if (transition.status === "REJECTED") throw new Error(`MVP_EVIDENCE_RUN_COMPLETE_REJECTED:${transition.failure}`)
  }
  const evidenceStore = new CoreEvidenceStore(input.assembler)
  for (const result of results) {
    if (result.eventTimeWindow.start !== assessment.eventTimeStart || result.eventTimeWindow.end !== assessment.eventTimeEnd || result.knowledgeMode !== "RETROSPECTIVE" || result.knowledgeTimeCutoff !== assessment.knowledgeTimeCutoff) throw new Error(`MVP_EVIDENCE_RESULT_TIME_DRIFT:${JSON.stringify({ result: { eventTimeWindow: result.eventTimeWindow, knowledgeMode: result.knowledgeMode, knowledgeTimeCutoff: result.knowledgeTimeCutoff }, assessment: { start: assessment.eventTimeStart, end: assessment.eventTimeEnd, cutoff: assessment.knowledgeTimeCutoff } })}`)
  }
  const evidence = await evidenceStore.assemble({ subject: { subjectId: assessment.instrument, subjectType: "INSTRUMENT" }, topic: "MVP_MARKET_STATE", timeScope: { eventTimeStart: assessment.eventTimeStart, eventTimeEnd: assessment.eventTimeEnd, knowledgeMode: "RETROSPECTIVE", knowledgeTimeCutoff: assessment.knowledgeTimeCutoff }, profile: PROFILE, selections: results.map((result) => ({ result, dependencySnapshotId: input.corpus.corpusId })), requirements: [], createdAt: assessment.createdAt })
  if (!("packet" in evidence) || ["CONFLICT", "REJECTED", "RETRYABLE_FAILURE"].includes(evidence.status)) throw new Error(`MVP_EVIDENCE_PACKET_${evidence.status}:${"reason" in evidence ? evidence.reason : "NO_PACKET"}`)
  const assessmentWrite = await new MvpEvidenceAssessmentStore(input.assembler).write(evidence.packet.packetVersionId, assessment)
  if (assessmentWrite.status === "CONFLICT") throw new Error("MVP_EVIDENCE_ASSESSMENT_CONFLICT")
  return Object.freeze({ assessment, packet: evidence.packet, runId: spec.runId, resultStatuses: Object.freeze(resultStatuses), packetStatus: evidence.status, assessmentStatus: assessmentWrite.status })
}

function selectEvidenceCorpus(rows: readonly Awaited<ReturnType<typeof persistWindow>>[]) {
  const certification = rows.filter((row) => row.assessment.eventTimeStart === "2026-07-11T00:00:00.000Z")
  const distinctStates = [...new Set(rows.map((row) => row.assessment.marketState))]
  const examples: typeof rows[number][] = []
  for (const state of distinctStates) {
    const candidate = rows.find((row) => row.assessment.marketState === state && !examples.some((item) => item.assessment.instrument === row.assessment.instrument)) ?? rows.find((row) => row.assessment.marketState === state)
    if (candidate && !examples.includes(candidate)) examples.push(candidate)
    if (examples.length === 4) break
  }
  const neutral = rows.find((row) => row.assessment.marketState === "NEUTRAL")
  if (neutral && !examples.includes(neutral)) examples.push(neutral)
  const mixed = rows.find((row) => row.assessment.marketState === "MIXED" || row.assessment.structuredInterpretation.counterEvidenceCodes.length >= 3)
  if (mixed && !examples.includes(mixed)) examples.push(mixed)
  return { certification, examples }
}

async function execute(command: "evaluate" | "recompute") {
  const corpus = JSON.parse(await readFile(CORPUS_PATH, "utf8")) as CorpusManifest
  const owner = runtime("MIGRATION_OWNER", "mvp-evidence-migration")
  await owner.connect(); const migrations = await seedGovernance(owner); await owner.shutdown()
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-evidence-d2" }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp-evidence-d3" } })
  const worker = runtime("CONSISTENCY_WORKER", "mvp-evidence-worker"), assembler = runtime("EVIDENCE_ASSEMBLER", "mvp-evidence-assembler")
  await worker.connect(); await assembler.connect()
  try {
    const windows = await readMvpEvidenceWindows({ d2: clients.d2, objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT! })
    const persisted = []
    for (let index = 0; index < windows.length; index += 1) {
      const item = await persistWindow({ corpus, data: windows[index]!, worker, assembler }); persisted.push(item)
      console.log(`[${index + 1}/${windows.length}] ${item.assessment.instrument} ${item.assessment.eventTimeStart.slice(0, 10)} ${item.assessment.marketState} packet=${item.packetStatus} assessment=${item.assessmentStatus}`)
    }
    const selected = selectEvidenceCorpus(persisted)
    const basis = { schemaVersion: "mvp-evidence-corpus-basis/v1", corpusId: corpus.corpusId, corpusChecksum: corpus.corpusChecksum, ruleSetId: MVP_EVIDENCE_RULE_SET_ID, ruleSetVersion: MVP_EVIDENCE_RULE_SET_VERSION, ruleRegistryChecksum: RULE_REGISTRY_CHECKSUM, measurementVersion: "mvp-market-measurements/1.0.0", evaluatedWindowCount: persisted.length, instruments: MVP_EVIDENCE_SYMBOLS, stateCounts: Object.fromEntries([...new Set(persisted.map((row) => row.assessment.marketState))].sort().map((state) => [state, persisted.filter((row) => row.assessment.marketState === state).length])), certificationSlice: selected.certification.map((row) => ({ assessment: row.assessment, packetId: row.packet.packetId, packetVersionId: row.packet.packetVersionId, packetChecksum: row.packet.packetChecksum })), examples: selected.examples.map((row) => ({ assessment: row.assessment, packetId: row.packet.packetId, packetVersionId: row.packet.packetVersionId, packetChecksum: row.packet.packetChecksum })) }
    const evidenceCorpusChecksum = canonicalChecksum(basis)
    const result = { schemaVersion: "mvp-evidence-corpus/v1", evidenceCorpusId: `mvp-evidence-corpus:${evidenceCorpusChecksum}`, evidenceCorpusChecksum, basis, recomputation: { command, allResultsDuplicateOrReused: persisted.every((row) => row.resultStatuses.every((status) => status !== "CREATED")), allPacketsReused: persisted.every((row) => row.packetStatus === "REUSED"), allAssessmentsDuplicate: persisted.every((row) => row.assessmentStatus === "DUPLICATE") }, publicationBoundary: { consumerProjectionStatus: "NOT_CREATED", consumerPublicationStatus: "NOT_PUBLISHED", d2PublicationState: "UNCHANGED_PENDING" }, migrations }
    if (command === "evaluate") await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8")
    else {
      const stored = JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as { evidenceCorpusChecksum: string }
      if (stored.evidenceCorpusChecksum !== evidenceCorpusChecksum || !result.recomputation.allResultsDuplicateOrReused || !result.recomputation.allPacketsReused || !result.recomputation.allAssessmentsDuplicate) throw new Error("MVP_EVIDENCE_RECOMPUTE_MISMATCH")
    }
    console.log(JSON.stringify(result, null, 2))
  } finally { await worker.shutdown(); await assembler.shutdown(); await clients.shutdown() }
}

async function inspect(command: "status" | "inspect" | "verify") {
  const verifier = runtime("READ_ONLY", `mvp-evidence-${command}`); await verifier.connect()
  try {
    const rows = await verifier.sql.unsafe<Array<{ assessment_count: number; packet_count: number; result_count: number; conflict_count: number; instrument_count: number }>>("SELECT (SELECT count(*)::int FROM evidence.mvp_market_assessments) assessment_count,(SELECT count(*)::int FROM evidence.core_packet_versions p JOIN evidence.core_packet_identities i USING(packet_id) WHERE i.topic='MVP_MARKET_STATE') packet_count,(SELECT count(*)::int FROM consistency.immutable_results WHERE rule_set_id=$1) result_count,(SELECT count(*)::int FROM consistency.result_conflicts WHERE rule_id IN (SELECT rule_id FROM consistency.rules WHERE rule_set_id=$1))+(SELECT count(*)::int FROM evidence.core_packet_conflicts) conflict_count,(SELECT count(DISTINCT subject_id)::int FROM evidence.mvp_market_assessments) instrument_count", [MVP_EVIDENCE_RULE_SET_ID])
    const result = { command, ...rows[0], consumerProjectionStatus: "NOT_CREATED_BY_MVP_EVIDENCE_WORKER" }
    if (command === "inspect") {
      const assessments = await verifier.sql.unsafe<Record<string, unknown>[]>("SELECT subject_id,event_time_start,event_time_end,market_state,confidence_classification,packet_version_id FROM evidence.mvp_market_assessments ORDER BY event_time_start DESC,subject_id LIMIT 12")
      console.log(JSON.stringify({ ...result, assessments }, null, 2)); return
    }
    if (command === "verify" && (result.instrument_count !== 6 || result.assessment_count !== 84 || result.packet_count !== 84 || result.result_count !== 420 || result.conflict_count !== 0)) throw new Error(`MVP_EVIDENCE_VERIFY_FAILED:${JSON.stringify(result)}`)
    console.log(JSON.stringify(result, null, 2))
  } finally { await verifier.shutdown() }
}

async function main() {
  const command = process.argv[2] as Command
  if (["evaluate", "recompute"].includes(command)) return execute(command as "evaluate" | "recompute")
  if (["status", "inspect", "verify"].includes(command)) return inspect(command as "status" | "inspect" | "verify")
  throw new Error("Usage: runMvpEvidence.ts <evaluate|recompute|status|inspect|verify>")
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_EVIDENCE_FAILED"); process.exitCode = 1 })
