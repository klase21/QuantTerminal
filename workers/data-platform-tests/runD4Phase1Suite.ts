import { blockingAndAdvisorySeparate, d2ReuseRejected, d3DatabaseRejected, d4TargetAccepted, illegalRunTransitionsFail, legalRunTransitions, missingD4TargetRejected, profilesProposedOnly, projectionsCannotReconstruct, ruleRegistryBounded, ruleSetReferencesResolve } from "./d4ContractChecks"
import { consistencyIdentityStable, evidenceIdentityStable, exactVersionChangesDigest, factVersionChangesEvidenceIdentity, generatedProseExcluded, positiveEvidenceVersionEnforced } from "./d4IdentityChecks"
import { d2Rejected, d3Rejected, d4ScopeAccepted, protectedRuntimeRejected } from "./d4ProtectedScopeChecks"
import { conflictsVisible, consistencyTablesPresent, d2TableNamesNotReused, d4MigrationNamesValid, d4MigrationOrderIsolated, evidenceTablesPresent, exactFactVersionsRequired, knowledgeModesClosed, noD2D3MigrationReference, noExecutableRoleDdl, noOpaquePacketJson, projectionTablesPresent } from "./d4SqlChecks"

const checks: readonly [string, boolean][] = [
  ["consistency identity deterministic", consistencyIdentityStable], ["exact fact version changes digest", exactVersionChangesDigest],
  ["evidence identity deterministic", evidenceIdentityStable], ["generated prose excluded from identity", generatedProseExcluded],
  ["fact version changes Evidence identity", factVersionChangesEvidenceIdentity], ["positive Evidence version enforced", positiveEvidenceVersionEnforced],
  ["rule registry bounded and proposed", ruleRegistryBounded], ["rule-set references resolve", ruleSetReferencesResolve],
  ["legal Consistency transitions", legalRunTransitions], ["illegal Consistency transitions fail", illegalRunTransitionsFail],
  ["blocking and advisory separate", blockingAndAdvisorySeparate], ["Profiles proposed only", profilesProposedOnly],
  ["consumer projections cannot reconstruct", projectionsCannotReconstruct], ["D4 isolated target accepted", d4TargetAccepted],
  ["missing D4 target rejected", missingD4TargetRejected], ["D2 URL reuse rejected", d2ReuseRejected], ["D3 database rejected", d3DatabaseRejected],
  ["D4 migration numbering", d4MigrationNamesValid], ["D4 migration order isolated", d4MigrationOrderIsolated],
  ["Consistency tables present", consistencyTablesPresent], ["Evidence tables present", evidenceTablesPresent], ["Projection tables present", projectionTablesPresent],
  ["D2 generic table names not reused", d2TableNamesNotReused],
  ["exact fact versions required", exactFactVersionsRequired], ["knowledge modes closed", knowledgeModesClosed],
  ["conflicts and requirements visible", conflictsVisible], ["no opaque Packet JSON", noOpaquePacketJson],
  ["no executable role DDL", noExecutableRoleDdl], ["no D2/D3 URL reuse in SQL", noD2D3MigrationReference],
  ["D4 scope accepted", d4ScopeAccepted], ["protected Evidence runtime rejected", protectedRuntimeRejected], ["D2 protected scope rejected", d2Rejected], ["D3 protected scope rejected", d3Rejected],
]
const failures = checks.filter(([, pass]) => !pass)
console.log("D4 PHASE 1 SUITE: " + (failures.length ? "FAIL" : "PASS"))
for (const [name, pass] of checks) console.log("[" + (pass ? "PASS" : "FAIL") + "] " + name)
if (failures.length) process.exitCode = 1
