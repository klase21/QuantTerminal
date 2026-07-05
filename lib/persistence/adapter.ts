import type { StorageResult } from "@/lib/persistence/result"
import type {
  StorageAdapterHealth,
  StorageArchiveReceipt,
  StorageArchiveRequest,
  StorageListQuery,
  StorageRecord,
  StorageRecordLocator,
  StorageRecordPage,
} from "@/lib/persistence/types"

export interface StorageAdapter {
  writeRecord(record: StorageRecord): Promise<StorageResult<StorageRecord>>
  readRecord(locator: StorageRecordLocator): Promise<StorageResult<StorageRecord>>
  recordExists(locator: StorageRecordLocator): Promise<StorageResult<boolean>>
  listRecords(query?: StorageListQuery): Promise<StorageResult<StorageRecordPage>>
  appendEvent(record: StorageRecord): Promise<StorageResult<StorageRecord>>
  markArchived(request: StorageArchiveRequest): Promise<StorageResult<StorageArchiveReceipt>>
  healthCheck(): Promise<StorageResult<StorageAdapterHealth>>
}
