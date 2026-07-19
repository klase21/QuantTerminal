import assert from "node:assert/strict"
import { MvpServingPostgresClient } from "../../../lib/data-platform/mvp-serving/client"
import { validateSeparateTargetPublicationFingerprint } from "../../../lib/data-platform/mvp-serving/inactiveStaging"

const database = "quantterminal_mvp8s_canary_unit1"
const port = "55439"
const targetId = `local-postgres:127.0.0.1:${port}/${database}`
const environment = Object.freeze({
  MVP_PUBLICATION_TARGET_MODE: "MVP8S_LOCAL_DISPOSABLE_CERTIFICATION",
  MVP_LOCAL_DISPOSABLE_HOST: "127.0.0.1",
  MVP_LOCAL_DISPOSABLE_PORT: port,
  MVP_LOCAL_DISPOSABLE_DATABASE: database,
  MVP_LOCAL_DISPOSABLE_TARGET_ID: targetId,
})

const url = (host: string, targetPort: string, targetDatabase: string) => `postgresql://qt_mvp8s_writer@${host}:${targetPort}/${targetDatabase}`

assert.doesNotThrow(() => new MvpServingPostgresClient(url("127.0.0.1", port, database), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database, role: "qt_mvp8s_writer" }))
assert.doesNotThrow(() => validateSeparateTargetPublicationFingerprint("LOCAL_DISPOSABLE_CERTIFICATION", targetId, targetId))
assert.throws(() => new MvpServingPostgresClient(url("127.0.0.1", port, database), "PUBLISHER", { ...environment, MVP_PUBLICATION_TARGET_MODE: "" }, "LOCAL_DISPOSABLE_CERTIFICATION", { database, role: "qt_mvp8s_writer" }), /MVP8S_DISPOSABLE_MODE_REQUIRED/)
assert.throws(() => new MvpServingPostgresClient(url("127.0.0.1", port, "quantterminal_mvp8r_canary_unit1"), "PUBLISHER", { ...environment, MVP_LOCAL_DISPOSABLE_DATABASE: "quantterminal_mvp8r_canary_unit1" }, "LOCAL_DISPOSABLE_CERTIFICATION", { database: "quantterminal_mvp8r_canary_unit1", role: "qt_mvp8s_writer" }), /MVP8S_DISPOSABLE_DATABASE_MISMATCH/)
assert.throws(() => new MvpServingPostgresClient(url("localhost", port, database), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database, role: "qt_mvp8s_writer" }), /MVP8S_DISPOSABLE_FINGERPRINT_MISMATCH/)
assert.throws(() => new MvpServingPostgresClient(url("127.0.0.2", port, database), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database, role: "qt_mvp8s_writer" }), /MVP8S_LOOPBACK_HOST_REQUIRED/)
assert.throws(() => new MvpServingPostgresClient(url("127.0.0.1", "55440", database), "PUBLISHER", environment, "LOCAL_DISPOSABLE_CERTIFICATION", { database, role: "qt_mvp8s_writer" }), /MVP8S_DISPOSABLE_PORT_MISMATCH/)
assert.throws(() => validateSeparateTargetPublicationFingerprint("LOCAL_DISPOSABLE_CERTIFICATION", "", ""), /MVP_DISPOSABLE_TARGET_FINGERPRINT_INVALID/)
assert.throws(() => validateSeparateTargetPublicationFingerprint("LOCAL_DISPOSABLE_CERTIFICATION", "local-postgres:127.0.0.1:55439/*", "local-postgres:127.0.0.1:55439/*"), /MVP_DISPOSABLE_TARGET_FINGERPRINT_INVALID/)
assert.throws(() => validateSeparateTargetPublicationFingerprint("LOCAL_DISPOSABLE_CERTIFICATION", "neon:soft-cell-16396854/br-royal-block-aop70mzq/neondb", "neon:soft-cell-16396854/br-royal-block-aop70mzq/neondb"), /MVP_DISPOSABLE_TARGET_FINGERPRINT_INVALID/)
assert.throws(() => validateSeparateTargetPublicationFingerprint("LOCAL_DISPOSABLE_CERTIFICATION", targetId, `${targetId}-other`), /MVP8L_TARGET_FINGERPRINT_MISMATCH/)

process.stdout.write(JSON.stringify({ status: "PASS", targetId, cases: 10 }))
