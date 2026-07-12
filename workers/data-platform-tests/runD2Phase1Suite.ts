import { assertCommitResultExhaustive } from "@/lib/data-platform/persistence"
import { commitIdA, commitIdB, ohlcvIdentityA, ohlcvIdentityB, oiIdentityA, oiIdentityB } from "./canonicalPersistenceIdentityChecks"
import { completeBindingsPass, conflictClassification, distinctVersionClassification, duplicateClassification, missingBindingsFail, missingCertificationFails } from "./canonicalCommitContractChecks"
import { decisionsResolve, illegalTransitionsFail, legalTransitionsPass } from "./publicationStateChecks"
import { protectedScopeFixturePasses, protectedScopeFixtureRejects } from "./protectedScopeChecks"
import { certificationBindingRequired, commitCertificationBindingRequired, governanceBindingsRequired, migrationNumbersUnique, migrationOrderPasses, noRawBytes, publicationHistoryAppendOnly, replacementPublicationAtomic, schemasComplete, supersessionSeparated, tablesComplete } from "./sqlMigrationChecks"
import { competingCorrectionDetected, reverseEdgeFails, selfEdgeFails, selfOrReverseSupersessionFails, validLineagePasses, validSupersessionPasses } from "./supersessionLineageChecks"

const checks: Array<[string, boolean]> = [
  ["legal publication transitions", legalTransitionsPass], ["illegal publication transitions fail", illegalTransitionsFail], ["publication decisions resolve", decisionsResolve],
  ["provider correction identity stability", ohlcvIdentityA.canonicalRecordId === ohlcvIdentityB.canonicalRecordId], ["provider-scoped identity differs", oiIdentityA.canonicalRecordId !== oiIdentityB.canonicalRecordId], ["commit retry identity stability", commitIdA === commitIdB],
  ["checksum-aware duplicate", duplicateClassification === "DUPLICATE"], ["checksum-aware conflict", conflictClassification === "CONFLICT"], ["distinct correction version", distinctVersionClassification === "DISTINCT_VERSION"],
  ["immutable bindings complete", completeBindingsPass], ["missing binding fails", missingBindingsFail], ["missing certification fails", missingCertificationFails], ["valid supersession", validSupersessionPasses], ["self supersession fails", selfOrReverseSupersessionFails], ["competing correction detected", competingCorrectionDetected],
  ["valid lineage", validLineagePasses], ["lineage self-edge fails", selfEdgeFails], ["reverse lineage fails", reverseEdgeFails],
  ["migration order", migrationOrderPasses], ["migration numbering unique", migrationNumbersUnique], ["schemas complete", schemasComplete], ["tables complete", tablesComplete],
  ["publication history append-only", publicationHistoryAppendOnly], ["replacement publication atomic", replacementPublicationAtomic], ["supersession separated", supersessionSeparated], ["raw bytes excluded", noRawBytes], ["SQL bindings required", governanceBindingsRequired], ["certification binding required", certificationBindingRequired], ["commit certification binding required", commitCertificationBindingRequired],
  ["protected scope accepts D2", protectedScopeFixturePasses], ["protected scope rejects legacy adapter", protectedScopeFixtureRejects],
  ["commit result exhaustive", assertCommitResultExhaustive({ status: "REJECTED", reasons: ["IDENTITY_MISSING"] }) === "REJECTED"],
]
const failures = checks.filter(([, pass]) => !pass)
console.log(`D2 PHASE 1 SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
