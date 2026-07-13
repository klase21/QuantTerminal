import {
  consistencyResultChecksum,
  createConsistencyResultIdentity,
  createImmutableConsistencyResult,
  reconcileConsistencyResult,
  validateConsistencyResultRequest,
  type ConsistencyResultWriteOutcome,
} from "@/lib/data-platform/consistency"
import { createResultFixture, temporalFact } from "./fixtures"

const checks: Array<[string, boolean]> = []
const check = (name: string, passed: boolean) => checks.push([name, passed])
const baseRequest = createResultFixture()
const base = createImmutableConsistencyResult(baseRequest)

check("Result identity deterministic", base.resultId === createImmutableConsistencyResult(baseRequest).resultId)
check("Result identity input-order independent", base.resultId === createImmutableConsistencyResult({ ...baseRequest, inputs: [...baseRequest.inputs].reverse() }).resultId)
check("Result checksum input-order independent", base.checksum === createImmutableConsistencyResult({ ...baseRequest, inputs: [...baseRequest.inputs].reverse() }).checksum)
check("exact Fact versions retained", base.inputs.every((input) => input.recordVersion === 1 && Boolean(input.canonicalRecordId)))
check("changed Fact version changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ inputs: [temporalFact("result-a", "left", 2), temporalFact("result-b", "right")] })).resultId)
check("changed input role changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ inputs: [temporalFact("result-a", "different"), temporalFact("result-b", "right")] })).resultId)
check("changed Rule version changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ ruleVersion: "2.0.0" })).resultId)
check("changed temporal policy changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ temporalPolicyVersion: "2" })).resultId)
check("changed severity policy changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ severityPolicyVersion: "2" })).resultId)
check("changed Knowledge cutoff changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ cutoff: "2026-02-01T00:59:00.000Z" })).resultId)
check("changed temporal alignment changes identity", base.resultId !== createImmutableConsistencyResult(createResultFixture({ mode: "WINDOW_CONTAINMENT" })).resultId)
check("execution time excluded from identity", base.resultId === createImmutableConsistencyResult(createResultFixture({ createdAt: "2026-02-01T02:00:00.000Z" })).resultId)
check("execution time excluded from checksum", base.checksum === createImmutableConsistencyResult(createResultFixture({ createdAt: "2026-02-01T02:00:00.000Z" })).checksum)
check("Run identity excluded from semantic Result", base.resultId === createImmutableConsistencyResult(createResultFixture({ executionProfile: "bounded-result-reuse" })).resultId)
check("changed outcome changes checksum without changing identity", base.resultId === createImmutableConsistencyResult(createResultFixture({ outcome: "INCONSISTENT" })).resultId && base.checksum !== createImmutableConsistencyResult(createResultFixture({ outcome: "INCONSISTENT" })).checksum)
check("changed diagnostic code changes checksum", base.checksum !== createImmutableConsistencyResult(createResultFixture({ diagnosticCode: "VALUES_DIVERGE" })).checksum)
check("Result core deeply bounded and frozen", Object.isFrozen(base) && Object.isFrozen(base.inputs) && Object.isFrozen(base.policyBindings))
check("future knowledge rejected", validateConsistencyResultRequest({ ...baseRequest, inputs: baseRequest.inputs.map((input) => ({ ...input, knowledgeAvailableAt: "2026-02-02T00:00:00.000Z" })) }) === "INPUT_REFERENCE_MISMATCH")
check("Run specification mismatch rejected", validateConsistencyResultRequest({ ...baseRequest, alignment: { ...baseRequest.alignment, runSpecificationChecksum: "b".repeat(64) } }) === "RUN_SPECIFICATION_MISMATCH")
check("temporal checksum mismatch rejected", validateConsistencyResultRequest({ ...baseRequest, alignment: { ...baseRequest.alignment, checksum: "b".repeat(64) } }) === "TEMPORAL_OUTCOME_INVALID")
const runReference = { resultId: base.resultId, runId: baseRequest.runSpecification.runId, runSpecificationChecksum: baseRequest.runSpecification.specificationChecksum, sourceAlignmentId: baseRequest.alignment.alignmentId, sourceAlignmentChecksum: baseRequest.alignment.checksum, linkedAt: baseRequest.createdAt }
check("read-only reconciliation passes", reconcileConsistencyResult(base, baseRequest, [runReference]).consistent)
check("read-only reconciliation detects checksum drift", reconcileConsistencyResult({ ...base, outcome: "INCONSISTENT" }, baseRequest, [runReference]).reasonCodes.includes("RESULT_CHECKSUM_MISMATCH"))
check("identity helper agrees with Result", createConsistencyResultIdentity(baseRequest).resultIdentity === base.resultIdentity)
const { checksum: _checksum, createdAt: _createdAt, ...material } = base
check("checksum helper agrees with Result", consistencyResultChecksum(material) === base.checksum)

function exhaustive(outcome: ConsistencyResultWriteOutcome): string {
  switch (outcome.status) {
    case "CREATED": case "DUPLICATE": case "REUSED": return outcome.result.resultId
    case "CONFLICT": return outcome.conflict.conflictId
    case "REJECTED": case "RETRYABLE_FAILURE": return outcome.reason
  }
}
check("write outcomes exhaustive", typeof exhaustive === "function")

const failures = checks.filter(([, passed]) => !passed)
console.log(`D4 PHASE 2B UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, passed] of checks) console.log(`[${passed ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
