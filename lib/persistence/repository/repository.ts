import type { StorageAdapter } from "@/lib/persistence/adapter"
import type { StorageResult } from "@/lib/persistence/result"
import type {
  StorageArchiveReceipt,
  StorageArchiveRequest,
  StorageListQuery,
  StorageRecord,
  StorageRecordLocator,
  StorageRecordPage,
} from "@/lib/persistence/types"
import { validateStorageRecord } from "@/lib/persistence/validation"
import { createRepositoryError } from "@/lib/persistence/repository/errors"
import {
  mapPriceObservation,
  mapHistoricalMarketRecord,
  mapHistoricalFundingRecord,
  mapHistoricalOpenInterestRecord,
  mapHistoricalLiquidationRecord,
  mapHistoricalAggTradeRecord,
  mapHistoricalProviderMetadata,
  mapHistoricalDatasetMetadata,
  mapHistoricalCoverageProjection,
  mapRuntimeRecord,
  mapSignalSnapshot,
} from "@/lib/persistence/repository/mapper"
import {
  findDuplicateOperationalIdentities,
  getOperationalIdentity,
  isOperationalRecordKind,
  mapOperationalRecord,
  validateOperationalRecordPersistenceIntent,
} from "@/lib/persistence/repository/operational"
import {
  createRepositoryFailure,
  createRepositorySuccess,
  type RepositoryFailure,
  type RepositoryFailureStatus,
  type RepositoryResult,
} from "@/lib/persistence/repository/result"
import type {
  OperationalRecordListQuery,
  OperationalRecordLocator,
  OperationalRecordPersistenceIntent,
  PriceObservationPersistenceIntent,
  HistoricalMarketPersistenceIntent,
  HistoricalFundingPersistenceIntent,
  HistoricalOpenInterestPersistenceIntent,
  HistoricalLiquidationPersistenceIntent,
  HistoricalAggTradePersistenceIntent,
  HistoricalProviderMetadataPersistenceIntent,
  HistoricalDatasetMetadataPersistenceIntent,
  HistoricalCoverageProjectionPersistenceIntent,
  RuntimeRecordPersistenceIntent,
  SignalSnapshotPersistenceIntent,
} from "@/lib/persistence/repository/types"
import {
  validateAdapterResult,
  validateOperationalRecordListQuery,
  validateOperationalRecordLocator,
  validateRepositoryArchiveRequest,
  validateRepositoryListQuery,
  validateRepositoryLocator,
} from "@/lib/persistence/repository/validation"

export interface PersistenceRepository {
  saveHistoricalCoverageProjection(
    intent: HistoricalCoverageProjectionPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalDatasetMetadata(
    intent: HistoricalDatasetMetadataPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalProviderMetadata(
    intent: HistoricalProviderMetadataPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalAggTradeRecord(
    intent: HistoricalAggTradePersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalLiquidationRecord(
    intent: HistoricalLiquidationPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalOpenInterestRecord(
    intent: HistoricalOpenInterestPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalFundingRecord(
    intent: HistoricalFundingPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveHistoricalMarketRecord(
    intent: HistoricalMarketPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  savePriceObservation(
    intent: PriceObservationPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveSignalSnapshot(
    intent: SignalSnapshotPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveRuntimeRecord(
    intent: RuntimeRecordPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveManyRuntimeRecords(
    intents: readonly RuntimeRecordPersistenceIntent[],
  ): Promise<readonly RepositoryResult<StorageRecord>[]>
  saveOperationalRecord(
    intent: OperationalRecordPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>>
  saveOperationalRecords(
    intents: readonly OperationalRecordPersistenceIntent[],
  ): Promise<readonly RepositoryResult<StorageRecord>[]>
  getOperationalRecord(
    locator: OperationalRecordLocator,
  ): Promise<RepositoryResult<StorageRecord>>
  listOperationalRecords(
    query?: OperationalRecordListQuery,
  ): Promise<RepositoryResult<StorageRecordPage>>
  getStorageRecord(
    locator: StorageRecordLocator,
  ): Promise<RepositoryResult<StorageRecord>>
  recordExists(locator: StorageRecordLocator): Promise<RepositoryResult<boolean>>
  archiveStorageRecord(
    request: StorageArchiveRequest,
  ): Promise<RepositoryResult<StorageArchiveReceipt>>
  listStorageRecords(
    query?: StorageListQuery,
  ): Promise<RepositoryResult<StorageRecordPage>>
}

function repositoryStatus(status: StorageResult<unknown>["status"]): RepositoryFailureStatus {
  switch (status) {
    case "DUPLICATE": return "DUPLICATE"
    case "NOT_FOUND": return "NOT_FOUND"
    case "VALIDATION_ERROR": return "VALIDATION_ERROR"
    case "CONFLICT": return "CONFLICT"
    case "UNAVAILABLE": return "UNAVAILABLE"
    default: return "ADAPTER_ERROR"
  }
}

function repositoryErrorCode(status: StorageResult<unknown>["status"]) {
  switch (status) {
    case "DUPLICATE": return "duplicate" as const
    case "NOT_FOUND": return "not_found" as const
    case "CONFLICT": return "conflict" as const
    case "UNAVAILABLE": return "unavailable" as const
    default: return "adapter_error" as const
  }
}

function forwardRepositoryFailure<T>(
  result: RepositoryFailure<unknown>,
): RepositoryResult<T> {
  return createRepositoryFailure(result.status, result.errors)
}

function translateAdapterResult<T>(
  input: unknown,
  validateValue: (value: unknown) => RepositoryResult<T>,
): RepositoryResult<T> {
  const validation = validateAdapterResult<T>(input)
  if (validation.status !== "SUCCESS") {
    return createRepositoryFailure(validation.status, validation.errors)
  }
  const result = validation.value
  if (result.status === "SUCCESS") return validateValue(result.value)

  return createRepositoryFailure(
    repositoryStatus(result.status),
    [createRepositoryError(
      repositoryErrorCode(result.status),
      `StorageAdapter returned ${result.status}.`,
      {
        retryable: result.status === "STORAGE_ERROR" || result.status === "UNAVAILABLE",
        cause: result.errors,
      },
    )],
    result.value,
  )
}

async function callAdapter<T>(
  operation: () => Promise<unknown>,
  validateValue: (value: unknown) => RepositoryResult<T>,
): Promise<RepositoryResult<T>> {
  try {
    return translateAdapterResult(await operation(), validateValue)
  } catch (cause) {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "adapter_error",
      "StorageAdapter threw instead of returning a structured result.",
      { retryable: true, cause },
    )])
  }
}

function validateRecordValue(value: unknown): RepositoryResult<StorageRecord> {
  const validation = validateStorageRecord(value)
  return validation.status === "SUCCESS"
    ? createRepositorySuccess(validation.value)
    : createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed StorageRecord.",
      { cause: validation.errors },
    )])
}

function validateBooleanValue(value: unknown): RepositoryResult<boolean> {
  return typeof value === "boolean"
    ? createRepositorySuccess(value)
    : createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter recordExists result must be boolean.",
    )])
}

function validateArchiveReceipt(value: unknown): RepositoryResult<StorageArchiveReceipt> {
  if (!value || typeof value !== "object") {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed archive receipt.",
    )])
  }
  const receipt = value as Partial<StorageArchiveReceipt>
  if (typeof receipt.recordId !== "string"
    || typeof receipt.recordKind !== "string"
    || typeof receipt.archivedAt !== "string"
    || !Number.isFinite(Date.parse(receipt.archivedAt))
    || typeof receipt.idempotencyKey !== "string") {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed archive receipt.",
    )])
  }
  return createRepositorySuccess(Object.freeze(receipt as StorageArchiveReceipt))
}

function validateRecordPage(value: unknown): RepositoryResult<StorageRecordPage> {
  if (!value || typeof value !== "object") {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed record page.",
    )])
  }
  const page = value as Partial<StorageRecordPage>
  if (!Array.isArray(page.records)
    || (page.nextCursor !== null && typeof page.nextCursor !== "string")) {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a malformed record page.",
    )])
  }
  const records: StorageRecord[] = []
  for (const item of page.records) {
    const validation = validateRecordValue(item)
    if (validation.status !== "SUCCESS") {
      return createRepositoryFailure(validation.status, validation.errors)
    }
    records.push(validation.value)
  }
  return createRepositorySuccess(Object.freeze({
    records: Object.freeze(records),
    nextCursor: page.nextCursor,
  }))
}

function validateOperationalRecordValue(
  value: unknown,
  expected?: OperationalRecordLocator,
): RepositoryResult<StorageRecord> {
  const validation = validateRecordValue(value)
  if (validation.status !== "SUCCESS") return validation
  const record = validation.value
  if (!isOperationalRecordKind(record.recordKind)
    || (expected !== undefined
      && (record.recordKind !== expected.recordKind || record.recordId !== expected.recordId))) {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned a non-operational or mismatched StorageRecord.",
    )])
  }
  return validation
}

function validateOperationalRecordPage(
  value: unknown,
): RepositoryResult<StorageRecordPage> {
  const validation = validateRecordPage(value)
  if (validation.status !== "SUCCESS") return validation
  if (validation.value.records.some(
    (record) => !isOperationalRecordKind(record.recordKind),
  )) {
    return createRepositoryFailure("ADAPTER_ERROR", [createRepositoryError(
      "invalid_adapter_result",
      "StorageAdapter returned non-operational records for an operational query.",
    )])
  }
  return validation
}

export function createPersistenceRepository(
  adapter: StorageAdapter,
): PersistenceRepository {
  const saveRuntimeRecord = async (
    intent: RuntimeRecordPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapRuntimeRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveSignalSnapshot = async (
    intent: SignalSnapshotPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapSignalSnapshot(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const savePriceObservation = async (
    intent: PriceObservationPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapPriceObservation(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalMarketRecord = async (
    intent: HistoricalMarketPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalMarketRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalFundingRecord = async (
    intent: HistoricalFundingPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalFundingRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalOpenInterestRecord = async (
    intent: HistoricalOpenInterestPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalOpenInterestRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalLiquidationRecord = async (
    intent: HistoricalLiquidationPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalLiquidationRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalAggTradeRecord = async (
    intent: HistoricalAggTradePersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalAggTradeRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalProviderMetadata = async (
    intent: HistoricalProviderMetadataPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalProviderMetadata(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalDatasetMetadata = async (
    intent: HistoricalDatasetMetadataPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalDatasetMetadata(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveHistoricalCoverageProjection = async (
    intent: HistoricalCoverageProjectionPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapHistoricalCoverageProjection(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      validateRecordValue,
    )
  }

  const saveOperationalRecord = async (
    intent: OperationalRecordPersistenceIntent,
  ): Promise<RepositoryResult<StorageRecord>> => {
    const mapping = mapOperationalRecord(intent)
    if (mapping.status !== "SUCCESS") return mapping
    return callAdapter(
      () => adapter.writeRecord(mapping.value),
      (value) => validateOperationalRecordValue(value, {
        recordId: mapping.value.recordId,
        recordKind: mapping.value.recordKind as OperationalRecordLocator["recordKind"],
      }),
    )
  }

  return Object.freeze({
    saveHistoricalCoverageProjection,
    saveHistoricalDatasetMetadata,
    saveHistoricalProviderMetadata,
    saveHistoricalAggTradeRecord,
    saveHistoricalLiquidationRecord,
    saveHistoricalOpenInterestRecord,
    saveHistoricalFundingRecord,
    saveHistoricalMarketRecord,
    savePriceObservation,
    saveSignalSnapshot,
    saveRuntimeRecord,
    saveOperationalRecord,

    async saveManyRuntimeRecords(intents) {
      const results: RepositoryResult<StorageRecord>[] = []
      for (const intent of intents) {
        results.push(await saveRuntimeRecord(intent))
      }
      return Object.freeze(results)
    },

    async saveOperationalRecords(intents) {
      const duplicateIdentities = findDuplicateOperationalIdentities(intents)
      const results: RepositoryResult<StorageRecord>[] = []
      for (const intent of intents) {
        const validation = validateOperationalRecordPersistenceIntent(intent)
        if (validation.status !== "SUCCESS") {
          results.push(forwardRepositoryFailure<StorageRecord>(validation))
          continue
        }
        const identity = getOperationalIdentity(validation.value.operationalRecord)
        if (duplicateIdentities.has(identity)) {
          results.push(createRepositoryFailure("VALIDATION_ERROR", [createRepositoryError(
            "duplicate_operational_identity",
            "Operational batch contains a duplicate type and recordId identity.",
            { field: "operationalRecord.recordId" },
          )]))
          continue
        }
        results.push(await saveOperationalRecord(validation.value))
      }
      return Object.freeze(results)
    },

    async getOperationalRecord(locator) {
      const validation = validateOperationalRecordLocator(locator)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<StorageRecord>(validation)
      }
      return callAdapter(
        () => adapter.readRecord(validation.value),
        (value) => validateOperationalRecordValue(value, validation.value),
      )
    },

    async listOperationalRecords(query) {
      const validation = validateOperationalRecordListQuery(query)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<StorageRecordPage>(validation)
      }
      return callAdapter(
        () => adapter.listRecords(validation.value),
        validateOperationalRecordPage,
      )
    },

    async getStorageRecord(locator) {
      const validation = validateRepositoryLocator(locator)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<StorageRecord>(validation)
      }
      return callAdapter(() => adapter.readRecord(validation.value), validateRecordValue)
    },

    async recordExists(locator) {
      const validation = validateRepositoryLocator(locator)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<boolean>(validation)
      }
      return callAdapter(() => adapter.recordExists(validation.value), validateBooleanValue)
    },

    async archiveStorageRecord(request) {
      const validation = validateRepositoryArchiveRequest(request)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<StorageArchiveReceipt>(validation)
      }
      return callAdapter(() => adapter.markArchived(validation.value), validateArchiveReceipt)
    },

    async listStorageRecords(query) {
      const validation = validateRepositoryListQuery(query)
      if (validation.status !== "SUCCESS") {
        return forwardRepositoryFailure<StorageRecordPage>(validation)
      }
      return callAdapter(() => adapter.listRecords(validation.value), validateRecordPage)
    },
  })
}
