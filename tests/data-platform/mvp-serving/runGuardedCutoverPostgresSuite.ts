import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { readFile } from "node:fs/promises"
import { canonicalChecksum } from "../../../lib/data-platform/contracts"
import { MvpServingPostgresClient } from "../../../lib/data-platform/mvp-serving/client"
import { createMinimalActiveServingFixture } from "../../../lib/data-platform/mvp-serving/certificationFixture"
import { GuardedServingCutoverControlPlane, computeCutoverAuthorization, createCutoverRequestId } from "../../../lib/data-platform/mvp-serving/cutoverControl"
import { copyInactiveCandidateToServingTarget, PostgresMvpInactiveServingReadPort } from "../../../lib/data-platform/mvp-serving/inactiveStaging"
import { MvpServingMigrationRunner } from "../../../lib/data-platform/mvp-serving/migrationRunner"
import { MvpServingStore, PostgresMvpServingReadPort } from "../../../lib/data-platform/mvp-serving/store"

const CANDIDATE_ID = "mvp8i-candidate:fa295d3b749fd45d8c5172c5b5568463a4e645f9a0312d2d7945c4840753dc57"
const CANDIDATE_CHECKSUM = CANDIDATE_ID.slice("mvp8i-candidate:".length)
const MEMBER_SET_CHECKSUM = "021b8ad9ea4710060dd5ab380174ade2a54ac1e57fa5a229affe6807e62a527e"
const WATERMARK_ID = "mre_a4eb426c1f92f2584962f8f3d6d61ae65abaec1aaa44bab152e12c7c43f1838a"
const WATERMARK_CHECKSUM = "a4eb426c1f92f2584962f8f3d6d61ae65abaec1aaa44bab152e12c7c43f1838a"
const SOURCE_TARGET = "neon:soft-cell-16396854/br-flat-grass-ao9rtnyr/neondb"
const OPERATOR = "jay-local-operator"

async function main(): Promise<void> {
const metaPath = process.argv[2], sourceUrlPath = process.argv[3]
if (!metaPath || !sourceUrlPath) throw new Error("MVP8S_CERTIFICATION_INPUT_PATH_REQUIRED")
const meta = JSON.parse(await readFile(metaPath, "utf8")) as { database: string; port: string; password: string }
const sourceUrl = (await readFile(sourceUrlPath, "utf8")).trim()
const host = "127.0.0.1", targetId = `local-postgres:${host}:${meta.port}/${meta.database}`
const environment = Object.freeze({ MVP_PUBLICATION_TARGET_MODE: "MVP8S_LOCAL_DISPOSABLE_CERTIFICATION", MVP_LOCAL_DISPOSABLE_HOST: host, MVP_LOCAL_DISPOSABLE_PORT: meta.port, MVP_LOCAL_DISPOSABLE_DATABASE: meta.database, MVP_LOCAL_DISPOSABLE_TARGET_ID: targetId, MVP8J_SOURCE_READER_URL: sourceUrl })
const password = randomBytes(24).toString("base64url")
const url = (role: string, secret = password) => `postgresql://${role}:${encodeURIComponent(secret)}@${host}:${meta.port}/${meta.database}`
const owner = new MvpServingPostgresClient(url("qt_mvp8s_owner", meta.password), "MIGRATION_OWNER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: meta.database, role: "qt_mvp8s_owner" })
const clients: MvpServingPostgresClient[] = [owner]

try {
  await owner.verify()
  await owner.sql.unsafe("CREATE ROLE mvp_serving_reader NOLOGIN; CREATE ROLE mvp_serving_publisher NOLOGIN")
  const migrations = await new MvpServingMigrationRunner(owner).apply("mvp8s-disposable-certification")
  assert.equal(migrations.length, 5)
  assert.equal(migrations.every((value) => value.status === "APPLIED"), true, JSON.stringify(migrations))
  await owner.sql.unsafe(`
    CREATE ROLE qt_mvp8s_seed LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    CREATE ROLE qt_mvp8s_copy LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    CREATE ROLE qt_mvp8s_control LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    CREATE ROLE qt_mvp8s_reader LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
    GRANT CONNECT ON DATABASE ${meta.database} TO qt_mvp8s_seed,qt_mvp8s_copy,qt_mvp8s_control,qt_mvp8s_reader;
    GRANT USAGE ON SCHEMA serving,serving_control TO qt_mvp8s_seed,qt_mvp8s_copy,qt_mvp8s_control,qt_mvp8s_reader;
    GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA serving TO qt_mvp8s_seed;
    GRANT SELECT,INSERT ON serving.serving_corpus,serving.serving_projection,serving.serving_evidence_summary,serving.serving_replay_sequence,serving.serving_corpus_member,serving.serving_candidate_manifest TO qt_mvp8s_copy;
    GRANT SELECT ON ALL TABLES IN SCHEMA serving,serving_control TO qt_mvp8s_control,qt_mvp8s_reader;
    GRANT INSERT ON serving.serving_exposure,serving_control.cutover_approval,serving_control.cutover_authorization,serving_control.cutover_event,serving_control.cutover_authorization_consumption TO qt_mvp8s_control;
  `)
  const seed = new MvpServingPostgresClient(url("qt_mvp8s_seed"), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: meta.database, role: "qt_mvp8s_seed" })
  const copy = new MvpServingPostgresClient(url("qt_mvp8s_copy"), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: meta.database, role: "qt_mvp8s_copy" })
  const control = new MvpServingPostgresClient(url("qt_mvp8s_control"), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: meta.database, role: "qt_mvp8s_control" })
  const reader = new MvpServingPostgresClient(url("qt_mvp8s_reader"), "READER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database: meta.database, role: "qt_mvp8s_reader" })
  const source = new MvpServingPostgresClient(sourceUrl, "READER", {}, "MANAGED_POSTGRES", { database: "neondb", role: "qt_inactive_reader" })
  clients.push(seed, copy, control, reader, source)
  await Promise.all([seed.verify(), copy.verify(), control.verify(), reader.verify(), source.verify()])

  const fixture = createMinimalActiveServingFixture()
  assert.equal(await new MvpServingStore(seed).publish(fixture), "CREATED")
  const readPort = new PostgresMvpServingReadPort(reader), oldExposure = await readPort.activeExposure()
  assert.ok(oldExposure)
  const sourceInput = await new PostgresMvpInactiveServingReadPort(source).exportCandidateInput(CANDIDATE_ID)
  const copyOptions = { targetId, expectedTargetId: targetId, sourceTargetId: SOURCE_TARGET, requestId: createCutoverRequestId("copy", { candidateId: CANDIDATE_ID, targetId }), operatorId: OPERATOR, copyReason: "MVP-8S disposable certification", expectedActiveCorpusId: fixture.corpus.corpusId, expectedActiveExposureId: oldExposure.exposureId, dryRun: false }
  const copied = await copyInactiveCandidateToServingTarget(copy, reader, sourceInput, copyOptions)
  assert.equal(copied.status, "CREATED")
  assert.equal((await copyInactiveCandidateToServingTarget(copy, reader, sourceInput, copyOptions)).status, "DUPLICATE")
  const candidateSelection = await new PostgresMvpInactiveServingReadPort(reader).selectCandidate(CANDIDATE_ID)
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
  const [dashboard, scanner, trades, replays] = await Promise.all([candidateSelection.dashboard(), candidateSelection.scanner(), Promise.all(symbols.map((symbol) => candidateSelection.tradeDecisionContext(symbol))), Promise.all(symbols.map((symbol) => candidateSelection.replay(symbol)))])
  assert.equal(dashboard.status, "AVAILABLE_INTERNAL")
  assert.equal(scanner.status, "AVAILABLE_INTERNAL")
  assert.equal(trades.every((value) => value.status === "AVAILABLE_INTERNAL"), true)
  assert.equal(replays.every((value) => value.status === "AVAILABLE_INTERNAL"), true)

  const plane = new GuardedServingCutoverControlPlane(control, targetId)
  const createdAt = "2026-07-19T01:00:00.000Z", expiresAt = "2026-07-19T03:00:00.000Z"
  const artifactChecksums = Object.freeze({ preflight: canonicalChecksum("mvp8s-disposable-preflight") })
  const approvalRequestId = createCutoverRequestId("approval", { candidateId: CANDIDATE_ID, targetId, baseline: fixture.corpus.corpusId })
  const approvalInput = { candidateId: CANDIDATE_ID, candidateChecksum: CANDIDATE_CHECKSUM, memberSetChecksum: MEMBER_SET_CHECKSUM, commonWatermarkId: WATERMARK_ID, commonWatermarkChecksum: WATERMARK_CHECKSUM, reviewedCommit: "72cd59550fc51de37bcca1b47082310f34d02023", reviewArtifactChecksums: artifactChecksums, targetFingerprint: targetId, operatorId: OPERATOR, approvalReason: "MVP-8S authorized final Production cutover", requestId: approvalRequestId, createdAt, expiresAt }
  await assert.rejects(() => plane.approveServingCandidateForCutover({ ...approvalInput, candidateChecksum: "0".repeat(64) }), /MVP8S_CANDIDATE_BINDING_MISMATCH/)
  const approval = await plane.approveServingCandidateForCutover(approvalInput)
  assert.equal(approval.eligibility, "ELIGIBLE_FOR_CUTOVER")
  assert.equal((await plane.approveServingCandidateForCutover(approvalInput)).status, "DUPLICATE")

  const activationRequestId = createCutoverRequestId("activation", { candidateId: CANDIDATE_ID, targetId, oldExposure: oldExposure.exposureId })
  const activationAuthorizationInput = { approvalId: approval.approvalId, operation: "ACTIVATE" as const, candidateId: CANDIDATE_ID, candidateChecksum: CANDIDATE_CHECKSUM, targetFingerprint: targetId, expectedCurrentExposureId: oldExposure.exposureId, expectedCurrentCorpusId: fixture.corpus.corpusId, expectedCurrentCorpusChecksum: fixture.corpus.servingChecksum, rollbackExposureId: oldExposure.exposureId, rollbackCorpusId: fixture.corpus.corpusId, rollbackCorpusChecksum: fixture.corpus.servingChecksum, rollbackPin: fixture.corpus.servingChecksum, rollbackDeploymentId: "dpl_disposable_rollback", relatedActivationEventId: null, operatorId: OPERATOR, requestId: createCutoverRequestId("activation-authorization", { activationRequestId }), createdAt, expiresAt }
  const activationAuthorization = await plane.createServingCutoverAuthorization(activationAuthorizationInput)
  const activationInput = { candidateId: CANDIDATE_ID, candidateChecksum: CANDIDATE_CHECKSUM, memberSetChecksum: MEMBER_SET_CHECKSUM, commonWatermarkId: WATERMARK_ID, commonWatermarkChecksum: WATERMARK_CHECKSUM, expectedCurrentExposureId: oldExposure.exposureId, expectedCurrentCorpusId: fixture.corpus.corpusId, expectedCurrentCorpusChecksum: fixture.corpus.servingChecksum, operatorId: OPERATOR, authorizationId: activationAuthorization.authorizationId, activationReason: "MVP-8S disposable activation", requestId: activationRequestId, targetFingerprint: targetId, effectiveAt: "2026-07-19T01:10:00.000Z", dryRun: true }
  const beforeDryRun = await owner.sql.unsafe<Array<{ exposures: number; events: number; consumptions: number }>>("SELECT (SELECT count(*)::int FROM serving.serving_exposure) exposures,(SELECT count(*)::int FROM serving_control.cutover_event) events,(SELECT count(*)::int FROM serving_control.cutover_authorization_consumption) consumptions")
  const activationDryRun = await plane.activateServingCandidateGuarded(activationInput)
  assert.equal(activationDryRun.status, "DRY_RUN")
  assert.deepEqual(await owner.sql.unsafe("SELECT (SELECT count(*)::int FROM serving.serving_exposure) exposures,(SELECT count(*)::int FROM serving_control.cutover_event) events,(SELECT count(*)::int FROM serving_control.cutover_authorization_consumption) consumptions"), beforeDryRun)

  const rollbackRequestId = createCutoverRequestId("rollback", { activationEventId: activationDryRun.eventId, oldExposure: oldExposure.exposureId })
  const rollbackAuthorizationInput = { approvalId: approval.approvalId, operation: "ROLLBACK" as const, candidateId: CANDIDATE_ID, candidateChecksum: CANDIDATE_CHECKSUM, targetFingerprint: targetId, expectedCurrentExposureId: activationDryRun.exposureId, expectedCurrentCorpusId: CANDIDATE_ID, expectedCurrentCorpusChecksum: CANDIDATE_CHECKSUM, rollbackExposureId: oldExposure.exposureId, rollbackCorpusId: fixture.corpus.corpusId, rollbackCorpusChecksum: fixture.corpus.servingChecksum, rollbackPin: fixture.corpus.servingChecksum, rollbackDeploymentId: "dpl_disposable_rollback", relatedActivationEventId: activationDryRun.eventId, operatorId: OPERATOR, requestId: createCutoverRequestId("rollback-authorization", { rollbackRequestId }), createdAt, expiresAt }
  const rollbackAuthorization = await plane.createServingCutoverAuthorization(rollbackAuthorizationInput)
  const activation = await plane.activateServingCandidateGuarded({ ...activationInput, dryRun: false })
  assert.equal(activation.status, "COMMITTED")
  assert.equal((await readPort.activeCorpus())?.corpusId, CANDIDATE_ID)
  assert.equal((await plane.activateServingCandidateGuarded({ ...activationInput, dryRun: false })).status, "DUPLICATE")
  await assert.rejects(() => plane.activateServingCandidateGuarded({ ...activationInput, requestId: `${activationRequestId}-conflict`, authorizationId: activationAuthorization.authorizationId, dryRun: false }), /MVP8S_CANDIDATE_NOT_INACTIVE|MVP8S_AUTHORIZATION_INVALID_OR_CONSUMED/)

  const rollbackInput = { activationEventId: activation.eventId, expectedActiveExposureId: activation.exposureId, expectedActiveCandidateId: CANDIDATE_ID, rollbackTargetExposureId: oldExposure.exposureId, rollbackTargetCorpusId: fixture.corpus.corpusId, rollbackTargetCorpusChecksum: fixture.corpus.servingChecksum, operatorId: OPERATOR, authorizationId: rollbackAuthorization.authorizationId, rollbackReason: "MVP-8S disposable rollback", requestId: rollbackRequestId, targetFingerprint: targetId, effectiveAt: "2026-07-19T01:20:00.000Z", dryRun: true }
  const rollbackDryRun = await plane.rollbackServingExposureGuarded(rollbackInput)
  assert.equal(rollbackDryRun.status, "DRY_RUN")
  const rollback = await plane.rollbackServingExposureGuarded({ ...rollbackInput, dryRun: false })
  assert.equal(rollback.status, "COMMITTED")
  assert.equal((await plane.rollbackServingExposureGuarded({ ...rollbackInput, dryRun: false })).status, "DUPLICATE")
  assert.equal((await readPort.activeCorpus())?.corpusId, fixture.corpus.corpusId)
  const final = await owner.sql.unsafe<Array<{ exposures: number; events: number; approvals: number; authorizations: number; consumptions: number; candidate_exposures: number }>>("SELECT (SELECT count(*)::int FROM serving.serving_exposure) exposures,(SELECT count(*)::int FROM serving_control.cutover_event) events,(SELECT count(*)::int FROM serving_control.cutover_approval) approvals,(SELECT count(*)::int FROM serving_control.cutover_authorization) authorizations,(SELECT count(*)::int FROM serving_control.cutover_authorization_consumption) consumptions,(SELECT count(*)::int FROM serving.serving_exposure WHERE corpus_id=$1) candidate_exposures", [CANDIDATE_ID])
  assert.deepEqual(final[0], { exposures: 3, events: 2, approvals: 1, authorizations: 2, consumptions: 2, candidate_exposures: 1 })
  await assert.rejects(() => copy.sql.unsafe("INSERT INTO serving.serving_exposure SELECT * FROM serving.serving_exposure LIMIT 1"), /permission denied/)
  await assert.rejects(() => reader.sql.unsafe("INSERT INTO serving.serving_corpus SELECT * FROM serving.serving_corpus LIMIT 1"), /read-only|permission denied/)
  const computedRollbackAuthorization = computeCutoverAuthorization(rollbackAuthorizationInput)
  assert.equal(computedRollbackAuthorization.authorizationId, rollbackAuthorization.authorizationId)
  process.stdout.write(JSON.stringify({ status: "PASS", targetId, migrations: migrations.map((value) => ({ id: value.migrationId, checksum: value.checksum })), counts: final[0], activation: { eventId: activation.eventId, exposureId: activation.exposureId }, rollback: { eventId: rollback.eventId, exposureId: rollback.exposureId }, oldCorpusId: fixture.corpus.corpusId }))
} finally {
  await Promise.allSettled(clients.map((client) => client.shutdown()))
}
}

main().catch((error) => { process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1 })
