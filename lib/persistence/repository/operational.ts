import { createIdempotencyKey } from "@/lib/persistence/idempotency"
import {
  isStorageRecordKind,
  OPERATIONAL_RECORD_KINDS,
  type OperationalRecordKind,
} from "@/lib/persistence/recordKind"
import type {
  StorageParentRef,
  StorageRecord,
} from "@/lib/persistence/types"
import { isStorageJsonValue } from "@/lib/persistence/validation"
import { createRepositoryError } from "@/lib/persistence/repository/errors"
import {
  createRepositoryFailure,
  createRepositorySuccess,
  type RepositoryResult,
} from "@/lib/persistence/repository/result"
import type {
  OperationalRecord,
  OperationalRecordPersistenceIntent,
  OperationalRecordType,
} from "@/lib/persistence/repository/types"
import { isOperationalRecordType } from "@/lib/persistence/repository/types"
import { validateMappedStorageRecord } from "@/lib/persistence/repository/validation"

type UnknownRecord = Record<string, unknown>

const OPERATIONAL_KIND_BY_TYPE: Readonly<
  Record<OperationalRecordType, OperationalRecordKind>
> = Object.freeze({
  SchedulerRun: "SCHEDULER_RUN",
  WorkerLock: "WORKER_LOCK",
  RetryState: "RETRY_STATE",
  JobState: "JOB_STATE",
  DeadLetter: "DEAD_LETTER",
})

const OPERATIONAL_KIND_SET = new Set<string>(OPERATIONAL_RECORD_KINDS)

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value))
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

function validateParentRefs(value: unknown): RepositoryResult<readonly StorageParentRef[]> {
  if (!Array.isArray(value)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_parent_refs",
      "Operational parentRefs must be an array.",
      { field: "operationalRecord.parentRefs" },
    )])
  }

  const seen = new Set<string>()
  const parentRefs: StorageParentRef[] = []
  for (const [index, parent] of value.entries()) {
    if (!isRecord(parent)
      || !isNonEmptyString(parent.recordId)
      || typeof parent.recordKind !== "string"
      || !isStorageRecordKind(parent.recordKind)) {
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "invalid_parent_refs",
        "Each operational parent reference requires a recordId and canonical recordKind.",
        { field: `operationalRecord.parentRefs.${index}` },
      )])
    }
    const identity = `${parent.recordKind}:${parent.recordId}`
    if (seen.has(identity)) {
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "invalid_parent_refs",
        "Operational parent references must be unique.",
        { field: `operationalRecord.parentRefs.${index}` },
      )])
    }
    seen.add(identity)
    parentRefs.push(Object.freeze({
      recordId: parent.recordId,
      recordKind: parent.recordKind as StorageParentRef["recordKind"],
    }))
  }

  return createRepositorySuccess(Object.freeze(parentRefs))
}

export function getOperationalRecordKind(
  operationalType: OperationalRecordType,
): OperationalRecordKind {
  return OPERATIONAL_KIND_BY_TYPE[operationalType]
}

export function isOperationalRecordKind(
  value: unknown,
): value is OperationalRecordKind {
  return typeof value === "string" && OPERATIONAL_KIND_SET.has(value)
}

export function validateOperationalRecord(
  input: unknown,
): RepositoryResult<OperationalRecord> {
  if (!isRecord(input)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_operational_type",
      "Operational record must be a plain object.",
      { field: "operationalRecord" },
    )])
  }
  if (!isOperationalRecordType(input.operationalType)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_operational_type",
      "Operational record uses an unsupported operationalType.",
      { field: "operationalRecord.operationalType" },
    )])
  }
  if (!isNonEmptyString(input.recordId)
    || !isNonEmptyString(input.operationalVersion)
    || !isPositiveInteger(input.schemaVersion)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Operational record requires recordId, operationalVersion, and schemaVersion.",
      { field: "operationalRecord" },
    )])
  }
  if (!isTimestamp(input.createdAt)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "Operational record createdAt must be a valid timestamp.",
      { field: "operationalRecord.createdAt" },
    )])
  }
  const parentRefs = validateParentRefs(input.parentRefs)
  if (parentRefs.status !== "SUCCESS") {
    return createRepositoryFailure(parentRefs.status, parentRefs.errors)
  }
  if (!Object.prototype.hasOwnProperty.call(input, "payload")
    || !isStorageJsonValue(input.payload)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "malformed_operational_payload",
      "Operational payload must be opaque JSON-safe data.",
      { field: "operationalRecord.payload" },
    )])
  }

  return createRepositorySuccess(Object.freeze({
    operationalType: input.operationalType,
    recordId: input.recordId,
    operationalVersion: input.operationalVersion,
    schemaVersion: input.schemaVersion,
    createdAt: input.createdAt,
    parentRefs: parentRefs.value,
    payload: input.payload,
  }) as OperationalRecord)
}

export function validateOperationalRecordPersistenceIntent(
  input: unknown,
): RepositoryResult<OperationalRecordPersistenceIntent> {
  if (!isRecord(input)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_operational_type",
      "Operational persistence intent must be an object.",
    )])
  }
  const record = validateOperationalRecord(input.operationalRecord)
  if (record.status !== "SUCCESS") {
    return createRepositoryFailure(record.status, record.errors)
  }
  if (!isTimestamp(input.recordedAt)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "Operational recordedAt must be a valid timestamp.",
      { field: "recordedAt" },
    )])
  }
  if (Date.parse(input.recordedAt) < Date.parse(record.value.createdAt)) {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "invalid_timestamp_metadata",
      "Operational recordedAt cannot precede createdAt.",
      { field: "recordedAt" },
    )])
  }
  const checksum = input.checksum
  let validatedChecksum: string | undefined
  if (checksum !== undefined) {
    if (!isNonEmptyString(checksum)) {
      return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
        "malformed_storage_record",
        "Operational checksum must be a non-empty string when provided.",
        { field: "checksum" },
      )])
    }
    validatedChecksum = checksum
  }

  return createRepositorySuccess(Object.freeze({
    operationalRecord: record.value,
    recordedAt: input.recordedAt,
    ...(validatedChecksum !== undefined ? { checksum: validatedChecksum } : {}),
  }))
}

export function getOperationalIdentity(record: OperationalRecord): string {
  return `${getOperationalRecordKind(record.operationalType)}:${record.recordId}`
}

export function mapOperationalRecord(
  intent: OperationalRecordPersistenceIntent,
): RepositoryResult<StorageRecord> {
  const validation = validateOperationalRecordPersistenceIntent(intent)
  if (validation.status !== "SUCCESS") {
    return createRepositoryFailure(validation.status, validation.errors)
  }
  const value = validation.value
  const record = value.operationalRecord
  const recordKind = getOperationalRecordKind(record.operationalType)
  const idempotencyKey = createIdempotencyKey(recordKind, [record.recordId])
  if (idempotencyKey.status !== "SUCCESS") {
    return createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
      "missing_runtime_identity",
      "Operational identity could not produce a canonical idempotency key.",
      { field: "operationalRecord.recordId", cause: idempotencyKey.errors },
    )])
  }

  return validateMappedStorageRecord({
    recordId: record.recordId,
    recordKind,
    idempotencyKey: idempotencyKey.value,
    runtimeVersion: record.operationalVersion,
    schemaVersion: record.schemaVersion,
    createdAt: record.createdAt,
    recordedAt: value.recordedAt,
    parentRefs: record.parentRefs,
    payload: record.payload,
    ...(value.checksum !== undefined ? { checksum: value.checksum } : {}),
  })
}

export function findDuplicateOperationalIdentities(
  intents: readonly OperationalRecordPersistenceIntent[],
): ReadonlySet<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const intent of intents) {
    const validation = validateOperationalRecordPersistenceIntent(intent)
    if (validation.status !== "SUCCESS") continue
    const identity = getOperationalIdentity(validation.value.operationalRecord)
    if (seen.has(identity)) duplicates.add(identity)
    seen.add(identity)
  }
  return duplicates
}
