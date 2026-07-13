import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { deriveCanonicalCommitId, type CanonicalCommitCommand, type CanonicalFactReference } from "@/lib/data-platform/persistence"
import type { CanonicalPersistenceAdapter, LatestCanonicalVersionResult } from "@/lib/data-platform/persistence/postgres"
import type { CanonicalCommitPort } from "@/lib/data-platform/population/contracts"

export type D3CorrectionPolicy = "FAIL_CLOSED" | "ALLOW_PROVIDER_CORRECTION"
export interface D3CanonicalCommitPort extends CanonicalCommitPort { readLatest(command: CanonicalCommitCommand): Promise<LatestCanonicalVersionResult> }

const factTable = (kind: CanonicalCommitCommand["fact"]["kind"]): CanonicalFactReference["factTable"] => kind

export function planProviderCorrection(command: CanonicalCommitCommand, predecessorVersion: number): CanonicalCommitCommand {
  const targetRecordVersion = predecessorVersion + 1
  const idempotencyKey = /:version:\d+$/.test(command.idempotencyKey) ? command.idempotencyKey.replace(/:version:\d+$/, `:version:${targetRecordVersion}`) : `${command.idempotencyKey}:version:${targetRecordVersion}`
  const commitId = deriveCanonicalCommitId({ idempotencyKey, canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: targetRecordVersion, checksum: command.fact.checksum })
  const requiredLineage = command.requiredLineage.map((edge) => {
    const truth = [edge.source.nodeId, edge.source.nodeVersion, command.fact.identity.canonicalRecordId, targetRecordVersion, edge.relationship]
    const digest = canonicalChecksum(truth)
    return Object.freeze({ ...edge, edgeId: `lin_${digest}`, destination: Object.freeze({ ...edge.destination, nodeVersion: String(targetRecordVersion) }), commitId, digest })
  })
  return Object.freeze({ ...command, operationType: "PROVIDER_CORRECTION", idempotencyKey, targetRecordVersion, predecessor: Object.freeze({ ...command.fact.identity, recordVersion: predecessorVersion, factTable: factTable(command.fact.kind) }), requiredLineage: Object.freeze(requiredLineage) })
}

export function createD3ToD2CanonicalCommitPort(adapter: CanonicalPersistenceAdapter, correctionPolicy: D3CorrectionPolicy = "FAIL_CLOSED"): D3CanonicalCommitPort {
  const readLatest = (command: CanonicalCommitCommand) => adapter.readLatestCanonicalVersion({ canonicalRecordId: command.fact.identity.canonicalRecordId, datasetId: command.fact.identity.datasetId, businessIdentity: command.fact.identity.businessIdentity, providerId: command.fact.providerId })
  return Object.freeze({
    readLatest,
    async execute(command) {
      const manifest = await adapter.registerRawObjectManifest(command.rawObject)
      if (manifest.status === "CONFLICT") return { status: "REJECTED" as const, reasons: ["CONSISTENCY_FAILED" as const] }
      if (manifest.status === "REJECTED") return { status: "REJECTED" as const, reasons: ["RAW_DATA_MISSING" as const] }
      const latest = await readLatest(command)
      if (latest.status === "TARGET_UNAVAILABLE") return { status: "RETRYABLE_FAILURE" as const, code: "CONNECTION_INTERRUPTED" as const, retryWithSameIdempotencyKey: true as const }
      if (latest.status === "INVALID_REQUEST" || latest.status === "CONFLICT") return { status: "REJECTED" as const, reasons: ["CONSISTENCY_FAILED" as const] }
      if (latest.status === "NOT_FOUND") return adapter.executeCanonicalCommit(command)
      if (latest.record.checksum === command.fact.checksum) return { status: "DUPLICATE" as const, canonicalRecordId: latest.record.canonicalRecordId, recordVersion: latest.record.recordVersion, checksum: latest.record.checksum }
      if (correctionPolicy !== "ALLOW_PROVIDER_CORRECTION") return { status: "REJECTED" as const, reasons: ["CONSISTENCY_FAILED" as const] }
      return adapter.executeCanonicalCommit(planProviderCorrection(command, latest.record.recordVersion))
    },
  })
}
