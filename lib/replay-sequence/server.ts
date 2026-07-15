import "server-only"

import type { ConsumerProjection } from "@/lib/data-platform/consumer-projections"
import type { ReplaySequenceModel } from "./contracts"
import { materializeMvpReplaySequence } from "./materialize"

const cache = new Map<string, Promise<ReplaySequenceModel>>()
export function readMvpReplaySequence(projection: ConsumerProjection): Promise<ReplaySequenceModel> {
  const key = `${projection.projectionVersionId}:${projection.projectionChecksum}`
  const existing = cache.get(key)
  if (existing) return existing
  const pending = materializeMvpReplaySequence(projection).catch((error) => { cache.delete(key); throw error })
  cache.set(key, pending)
  return pending
}
