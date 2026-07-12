import { candidateIndependentOfRunWorker, candidateA, candidateB, distinctIdentities, jobRequestA, jobRequestB, unitIdA, unitIdB } from "./populationIdentityChecks"
import { aggregateFailed, aggregatePartial, aggregateSucceeded, fencingMonotonic, illegalJobTransitionsFail, illegalUnitTransitionsFail, legalJobTransitions, legalUnitTransitions, staleFencingRejected } from "./populationStateChecks"
import { conflictIsNotSuccess, duplicateIsIdempotentCompletion, failedCommitCannotAdvance } from "./populationOutcomeChecks"
import { appendOnlyHistoryPresent, candidateSubmissionUnique, d2MigrationsUntouchedByOrder, fencingRequired, migrationNamesValid, rawBytesExcluded, requiredTablesPresent, supersessionNotLineage } from "./populationSqlChecks"
import { candidateKindsBounded, candidateToSubmissionCardinality, retryTaxonomyComplete } from "./populationContractChecks"
import { phase1ScopePasses, protectedScopeRejected } from "./populationProtectedScopeChecks"

const checks: Array<[string, boolean]> = [
  ["job request identity deterministic", jobRequestA === jobRequestB], ["unit identity deterministic", unitIdA === unitIdB], ["candidate identity deterministic", candidateA === candidateB],
  ["identity hierarchy distinct", distinctIdentities], ["candidate independent of worker and run", candidateIndependentOfRunWorker],
  ["legal job transitions", legalJobTransitions], ["illegal job transitions fail", illegalJobTransitionsFail], ["legal unit transitions", legalUnitTransitions], ["illegal unit transitions fail", illegalUnitTransitionsFail],
  ["stale fencing token rejected", staleFencingRejected], ["fencing token monotonic", fencingMonotonic], ["job aggregate succeeded", aggregateSucceeded], ["job aggregate partial", aggregatePartial], ["job aggregate failed", aggregateFailed],
  ["duplicate idempotent completion", duplicateIsIdempotentCompletion], ["conflict not success", conflictIsNotSuccess], ["failed commit blocks watermark", failedCommitCannotAdvance],
  ["retry taxonomy exhaustive", retryTaxonomyComplete], ["typed candidates bounded", candidateKindsBounded.length === 5], ["candidate submission cardinality", candidateToSubmissionCardinality.length > 0],
  ["migration filename and numbering", migrationNamesValid], ["required SQL tables", requiredTablesPresent], ["SQL fencing constraints", fencingRequired], ["candidate submission unique", candidateSubmissionUnique],
  ["append-only event tables", appendOnlyHistoryPresent], ["raw bytes excluded", rawBytesExcluded], ["D2 migration sequence isolated", d2MigrationsUntouchedByOrder], ["supersession not lineage", supersessionNotLineage],
  ["protected scope accepts D3", phase1ScopePasses], ["protected scope rejects backfill", protectedScopeRejected],
]
const failures = checks.filter(([, pass]) => !pass)
console.log(`D3 PHASE 1 SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
