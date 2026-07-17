import { validateMvpBoundedPersistenceContract, type MvpEvidenceWindowData } from "@/lib/data-platform/consistency"

const checksum = "a".repeat(64)
const commitId = "commit_actual"
const data = {
  measurement: {
    instrument: "SOLUSDT",
    eventTimeStart: "2026-07-15T00:00:00.000Z",
    eventTimeEnd: "2026-07-16T00:00:00.000Z",
  },
  committedInputs: [{
    commitId,
    canonicalRecordId: "record_actual",
    recordVersion: 1,
    checksum,
    datasetId: "open-interest",
    symbol: "SOLUSDT",
  }],
} as unknown as MvpEvidenceWindowData

const contract = {
  instrument: "SOLUSDT",
  eventTimeStart: "2026-07-15T00:00:00.000Z",
  eventTimeEnd: "2026-07-16T00:00:00.000Z",
  committedInputIdentities: [{ identity: commitId, checksum }],
  modelVersion: "mvp8c-test/1.0.0",
  modelChecksum: "b".repeat(64),
}

validateMvpBoundedPersistenceContract(data, contract)

let syntheticRejected = false
try {
  validateMvpBoundedPersistenceContract(data, {
    ...contract,
    committedInputIdentities: [{ identity: "record_actual", checksum }],
  })
} catch (error) {
  syntheticRejected = error instanceof Error && error.message === "BOUNDED_EVIDENCE_COMMITTED_INPUT_MISSING"
}

if (!syntheticRejected) throw new Error("SYNTHETIC_COMMIT_ID_ACCEPTED")
console.log("MVP BOUNDED COMMITTED INPUT SUITE: PASS")
