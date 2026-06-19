import type {
  HistoricalCacheIdentity,
  HistoricalCacheReadOptions,
  HistoricalCacheReadResult,
} from "@/core/historical-intelligence/cache/cacheTypes"
import { readHistoricalCache } from "@/lib/historical-intelligence/cache/fileCacheStore"

export interface CacheFirstRequest {
  identity: HistoricalCacheIdentity
  expectedSchemaVersion: string
  allowPartial?: boolean
}

export async function consumeHistoricalCache<
  TData,
  TMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  request: CacheFirstRequest,
  options: Pick<HistoricalCacheReadOptions, "now"> = {},
): Promise<HistoricalCacheReadResult<TData, TMetadata>> {
  return readHistoricalCache<TData, TMetadata>(request.identity, {
    expectedSchemaVersion: request.expectedSchemaVersion,
    allowPartial: request.allowPartial,
    allowExpired: false,
    now: options.now,
  })
}
