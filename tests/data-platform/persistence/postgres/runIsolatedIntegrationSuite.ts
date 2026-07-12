import { applyApprovedMigrations, createCanonicalPersistenceAdapter } from "@/lib/data-platform/persistence/postgres"
import { fundingCommand, rawManifest } from "./fixtures"
import { createHarness, isolatedUrl } from "./harness"

async function main() {
if (!isolatedUrl()) {
  console.log("D2 ISOLATED POSTGRES INTEGRATION SUITE: BLOCKED")
  console.log("[BLOCKED] D2_ISOLATED_POSTGRES_URL is not configured.")
  process.exitCode = 2
} else {
  const checks: Array<[string, boolean]> = []
  const check = (name: string, pass: boolean) => checks.push([name, pass])
  const harness = await createHarness()
  try {
    await harness.reset()
    await harness.migrate()
    const rerun = await applyApprovedMigrations(harness.client, "d2-isolated-rerun")
    check("migration rerun skips", rerun.length === 4 && rerun.every((result) => result.status === "SKIPPED"))
    await harness.client.sql`UPDATE control.migration_ledger SET migration_checksum=${"0".repeat(64)} WHERE migration_id='004'`
    const changedChecksum = await applyApprovedMigrations(harness.client, "d2-isolated-checksum-test")
    const changedResult = changedChecksum.at(-1)
    check("changed applied migration fails closed", changedResult?.status === "FAILED" && changedResult.reason === "APPLIED_MIGRATION_CHECKSUM_MISMATCH")
    await harness.reset(); await harness.migrate()
    await harness.seedGovernance()

    const initial = fundingCommand()
    await harness.adapter.registerRawObjectManifest(initial.rawObject)
    const first = await harness.adapter.executeCanonicalCommit(initial)
    const duplicate = await harness.adapter.executeCanonicalCommit(initial)
    check("first commit succeeds", first.status === "SUCCESS")
    check("identical retry is duplicate", duplicate.status === "DUPLICATE")
    if (first.status !== "SUCCESS") throw new Error("Initial commit did not succeed")
    check("commit reconciliation", (await harness.adapter.reconcileCommit(first.commit.commitId)).consistent)
    check("lineage graph acyclic", await harness.adapter.verifyLineageAcyclic())
    check("one commit outbox event", (await harness.adapter.readOutboxEvents()).filter((event) => event.commitId === first.commit.commitId && event.eventType === "CANONICAL_RECORD_COMMITTED").length === 1)

    const conflictCommand = fundingCommand({ suffix: "conflict", rate: "0.0002" })
    await harness.adapter.registerRawObjectManifest(conflictCommand.rawObject)
    const conflict = await harness.adapter.executeCanonicalCommit(conflictCommand)
    check("different checksum is conflict", conflict.status === "CONFLICT")
    check("conflict preserved in quarantine", (await harness.adapter.readQuarantineConflicts(first.fact.canonicalRecordId)).length === 1)

    const certified = await harness.adapter.appendPublicationDecision({ canonicalRecordId: first.fact.canonicalRecordId, recordVersion: 1, nextState: "CERTIFIED", policyVersionId: initial.fact.governance.policyVersionId, decidedAt: "2026-01-01T00:01:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    const published = await harness.adapter.appendPublicationDecision({ canonicalRecordId: first.fact.canonicalRecordId, recordVersion: 1, nextState: "PUBLISHED", policyVersionId: initial.fact.governance.policyVersionId, decidedAt: "2026-01-01T00:02:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    check("publication legal transitions", certified.status === "SUCCESS" && published.status === "SUCCESS")
    const illegal = await harness.adapter.appendPublicationDecision({ canonicalRecordId: first.fact.canonicalRecordId, recordVersion: 1, nextState: "PENDING", policyVersionId: initial.fact.governance.policyVersionId, decidedAt: "2026-01-01T00:03:00.000Z", reasonCodes: ["ILLEGAL_TEST"] })
    check("illegal publication transition rejected", illegal.status === "REJECTED")

    const correction = fundingCommand({ suffix: "correction", rate: "0.0003", version: 2, correction: true, predecessor: first.fact })
    await harness.adapter.registerRawObjectManifest(correction.rawObject)
    const corrected = await harness.adapter.executeCanonicalCommit(correction)
    check("correction creates version two", corrected.status === "SUCCESS" && corrected.fact.recordVersion === 2)
    check("predecessor remains published while correction pending", (await harness.adapter.readCanonicalRecordVersion(first.fact.canonicalRecordId, 1))?.publicationState === "PUBLISHED")
    if (corrected.status !== "SUCCESS") throw new Error("Correction commit did not succeed")
    await harness.adapter.appendPublicationDecision({ canonicalRecordId: corrected.fact.canonicalRecordId, recordVersion: 2, nextState: "CERTIFIED", policyVersionId: correction.fact.governance.policyVersionId, decidedAt: "2026-01-01T00:04:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    check("certification does not supersede predecessor", (await harness.adapter.readCanonicalRecordVersion(first.fact.canonicalRecordId, 1))?.publicationState === "PUBLISHED")
    const correctionPublished = await harness.adapter.appendPublicationDecision({ canonicalRecordId: corrected.fact.canonicalRecordId, recordVersion: 2, nextState: "PUBLISHED", policyVersionId: correction.fact.governance.policyVersionId, decidedAt: "2026-01-01T00:05:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    check("correction publication succeeds", correctionPublished.status === "SUCCESS")
    check("predecessor superseded atomically", (await harness.adapter.readCanonicalRecordVersion(first.fact.canonicalRecordId, 1))?.publicationState === "SUPERSEDED" && (await harness.adapter.readCanonicalRecordVersion(first.fact.canonicalRecordId, 2))?.publicationState === "PUBLISHED")

    await harness.reset(); await harness.migrate(); await harness.seedGovernance()
    const concurrent = fundingCommand({ suffix: "concurrent" }); await harness.adapter.registerRawObjectManifest(concurrent.rawObject)
    const same = await Promise.all([harness.adapter.executeCanonicalCommit(concurrent), harness.adapter.executeCanonicalCommit(concurrent)])
    check("real concurrent identical insert", same.filter((result) => result.status === "SUCCESS").length === 1 && same.filter((result) => result.status === "DUPLICATE").length === 1)

    await harness.reset(); await harness.migrate(); await harness.seedGovernance()
    const left = fundingCommand({ suffix: "left", rate: "0.001" }); const right = fundingCommand({ suffix: "right", rate: "0.002" })
    await Promise.all([harness.adapter.registerRawObjectManifest(left.rawObject), harness.adapter.registerRawObjectManifest(right.rawObject)])
    const incompatible = await Promise.all([harness.adapter.executeCanonicalCommit(left), harness.adapter.executeCanonicalCommit(right)])
    check("real concurrent incompatible insert", incompatible.filter((result) => result.status === "SUCCESS").length === 1 && incompatible.filter((result) => result.status === "CONFLICT").length === 1)

    await harness.reset(); await harness.migrate(); await harness.seedGovernance()
    const predecessorCommand = fundingCommand({ suffix: "predecessor" }); await harness.adapter.registerRawObjectManifest(predecessorCommand.rawObject)
    const predecessor = await harness.adapter.executeCanonicalCommit(predecessorCommand)
    if (predecessor.status !== "SUCCESS") throw new Error("Concurrent correction predecessor failed")
    await harness.adapter.appendPublicationDecision({ canonicalRecordId: predecessor.fact.canonicalRecordId, recordVersion: 1, nextState: "CERTIFIED", policyVersionId: predecessorCommand.fact.governance.policyVersionId, decidedAt: "2026-01-02T00:01:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    await harness.adapter.appendPublicationDecision({ canonicalRecordId: predecessor.fact.canonicalRecordId, recordVersion: 1, nextState: "PUBLISHED", policyVersionId: predecessorCommand.fact.governance.policyVersionId, decidedAt: "2026-01-02T00:02:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    const correctionLeft = fundingCommand({ suffix: "correction-left", rate: "0.003", version: 2, correction: true, predecessor: predecessor.fact })
    const correctionRight = fundingCommand({ suffix: "correction-right", rate: "0.004", version: 2, correction: true, predecessor: predecessor.fact })
    await Promise.all([harness.adapter.registerRawObjectManifest(correctionLeft.rawObject), harness.adapter.registerRawObjectManifest(correctionRight.rawObject)])
    const corrections = await Promise.all([harness.adapter.executeCanonicalCommit(correctionLeft), harness.adapter.executeCanonicalCommit(correctionRight)])
    check("competing corrections elect one successor", corrections.filter((result) => result.status === "SUCCESS").length === 1 && corrections.filter((result) => result.status === "CONFLICT").length === 1)
    const successor = corrections.find((result) => result.status === "SUCCESS")
    if (!successor || successor.status !== "SUCCESS") throw new Error("No correction successor was elected")
    await harness.adapter.appendPublicationDecision({ canonicalRecordId: successor.fact.canonicalRecordId, recordVersion: 2, nextState: "CERTIFIED", policyVersionId: correctionLeft.fact.governance.policyVersionId, decidedAt: "2026-01-02T00:03:00.000Z", reasonCodes: ["ISOLATED_TEST"] })
    const concurrentPublish = await Promise.all([
      harness.adapter.appendPublicationDecision({ canonicalRecordId: successor.fact.canonicalRecordId, recordVersion: 2, nextState: "PUBLISHED", policyVersionId: correctionLeft.fact.governance.policyVersionId, decidedAt: "2026-01-02T00:04:00.000Z", reasonCodes: ["ISOLATED_TEST_A"] }),
      harness.adapter.appendPublicationDecision({ canonicalRecordId: successor.fact.canonicalRecordId, recordVersion: 2, nextState: "PUBLISHED", policyVersionId: correctionLeft.fact.governance.policyVersionId, decidedAt: "2026-01-02T00:04:01.000Z", reasonCodes: ["ISOLATED_TEST_B"] }),
    ])
    check("concurrent publication elects one transition", concurrentPublish.filter((result) => result.status === "SUCCESS").length === 1)
    const publishedCount = await harness.client.sql<{ readonly count: number }[]>`SELECT count(*)::int AS count FROM repository.record_versions WHERE canonical_record_id=${successor.fact.canonicalRecordId} AND current_publication_state='PUBLISHED'`
    check("only one active published successor", publishedCount[0]?.count === 1)

    for (const failurePoint of ["AFTER_COMMIT_ROW", "AFTER_FACT_ROW", "AFTER_ENVELOPE_ROW", "AFTER_VERSION_ROW", "AFTER_LINEAGE_ROW", "AFTER_DECISION_ROW", "BEFORE_OUTBOX_ROW"] as const) {
      await harness.reset(); await harness.migrate(); await harness.seedGovernance()
      const command = fundingCommand({ suffix: failurePoint }); await harness.adapter.registerRawObjectManifest(command.rawObject)
      const adapter = createCanonicalPersistenceAdapter(harness.client, { failurePoint, allowFailureInjection: true, maxRetries: 0 })
      await adapter.executeCanonicalCommit(command)
      const commitId = command.requiredLineage[0].commitId
      const count = await harness.client.sql<{ readonly count: number }[]>`SELECT count(*)::int AS count FROM control.canonical_commits WHERE commit_id=${commitId}`
      check(`rollback ${failurePoint}`, count[0]?.count === 0)
    }

    await harness.reset(); await harness.migrate(); await harness.seedGovernance()
    const roleCommand = fundingCommand({ suffix: "role-function" }); await harness.adapter.registerRawObjectManifest(roleCommand.rawObject)
    const roleRecord = await harness.adapter.executeCanonicalCommit(roleCommand)
    if (roleRecord.status !== "SUCCESS") throw new Error("Role verification record failed")
    let approvedFunctionUsable = true
    try {
      await harness.client.transaction(async (sql) => {
        await sql`SET LOCAL ROLE qt_d2_canonical_writer`
        await sql`SELECT repository.append_publication_decision(${"role-decision-certified"},${roleRecord.commit.commitId},${roleRecord.fact.canonicalRecordId},1,'CERTIFIED'::repository.publication_state,${roleCommand.fact.governance.policyVersionId},${"2026-01-03T00:01:00.000Z"},${sql.array(["ROLE_TEST"])},${"role-outbox-certified"},${null})`
      })
    } catch { approvedFunctionUsable = false }
    check("approved publication function usable by canonical writer", approvedFunctionUsable)

    // Privilege checks require the isolated migration owner to be allowed to SET ROLE.
    let readOnlyDenied = false
    try { await harness.client.transaction(async (sql) => { await sql`SET LOCAL ROLE qt_d2_read_only`; await sql`INSERT INTO control.registry_snapshots (snapshot_id,registry_version,content_checksum,canonical_content,effective_at,created_at) VALUES ('denied','1',repeat('0',64),'{}',now(),now())` }) } catch { readOnlyDenied = true }
    check("read-only insert denied", readOnlyDenied)
    let deleteDenied = false
    try { await harness.client.transaction(async (sql) => { await sql`SET LOCAL ROLE qt_d2_canonical_writer`; await sql`DELETE FROM canonical.funding` }) } catch { deleteDenied = true }
    check("canonical writer delete denied", deleteDenied)
    let ledgerDenied = false
    try { await harness.client.transaction(async (sql) => { await sql`SET LOCAL ROLE qt_d2_canonical_writer`; await sql`UPDATE control.migration_ledger SET applied_by='forbidden'` }) } catch { ledgerDenied = true }
    check("migration ledger mutation denied", ledgerDenied)
    let schemaAlterDenied = false
    try { await harness.client.transaction(async (sql) => { await sql`SET LOCAL ROLE qt_d2_canonical_writer`; await sql`ALTER TABLE canonical.funding ADD COLUMN forbidden text` }) } catch { schemaAlterDenied = true }
    check("canonical writer schema alteration denied", schemaAlterDenied)
    let stateUpdateDenied = false
    try { await harness.client.transaction(async (sql) => { await sql`SET LOCAL ROLE qt_d2_canonical_writer`; await sql`UPDATE repository.record_versions SET current_publication_state='REVOKED'` }) } catch { stateUpdateDenied = true }
    check("arbitrary publication state update denied", stateUpdateDenied)

    const failures = checks.filter(([, pass]) => !pass)
    console.log(`D2 ISOLATED POSTGRES INTEGRATION SUITE: ${failures.length ? "FAIL" : "PASS"}`)
    for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
    if (failures.length) process.exitCode = 1
  } finally {
    try { await harness.reset() } finally { await harness.shutdown() }
  }
}
}

void main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
