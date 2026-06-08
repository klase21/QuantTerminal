import { mockEtfFlowAdapter } from "./externalAdapters/mockEtfFlowAdapter"
import { mockMacroCalendarAdapter } from "./externalAdapters/mockMacroCalendarAdapter"
import { mockPolymarketAdapter } from "./externalAdapters/mockPolymarketAdapter"
import type {
  ExternalEventAdapter,
  ExternalEventAdapterHealth,
  ExternalEventFetchQuery,
  ExternalEventNormalizationResult,
  ExternalEventSourceType,
} from "./externalEventAdapterTypes"

const ADAPTERS: ExternalEventAdapter[] = [
  mockPolymarketAdapter,
  mockEtfFlowAdapter,
  mockMacroCalendarAdapter,
]

export interface ExternalAdapterPreviewResult {
  health: ExternalEventAdapterHealth
  rawItemCount: number
  normalizedEventCount: number
  rawItems: Awaited<ReturnType<ExternalEventAdapter["fetchMock"]>>["rawItems"]
  normalizedCandidates: ExternalEventNormalizationResult[]
  warnings: string[]
}

export function listExternalEventAdapters() {
  return ADAPTERS.map((adapter) => ({
    sourceType: adapter.sourceType,
    sourceName: adapter.sourceName,
  }))
}

export function getExternalEventAdapter(sourceType: ExternalEventSourceType) {
  return ADAPTERS.find((adapter) => adapter.sourceType === sourceType) ?? null
}

export function getExternalEventAdapterHealth(sourceType: ExternalEventSourceType) {
  return getExternalEventAdapter(sourceType)?.getHealth() ?? null
}

export function getAllExternalEventAdapterHealth() {
  return ADAPTERS.map((adapter) => adapter.getHealth())
}

export async function previewExternalEventAdapter(
  sourceType: ExternalEventSourceType,
  query?: ExternalEventFetchQuery,
): Promise<ExternalAdapterPreviewResult | null> {
  const adapter = getExternalEventAdapter(sourceType)
  if (!adapter) return null

  const fetchResult = await adapter.fetchMock(query)
  const normalizedCandidates = fetchResult.rawItems.map((item) => adapter.normalize(item))

  return {
    health: adapter.getHealth(),
    rawItemCount: fetchResult.rawItems.length,
    normalizedEventCount: normalizedCandidates.length,
    rawItems: fetchResult.rawItems,
    normalizedCandidates,
    warnings: [
      ...fetchResult.warnings,
      ...normalizedCandidates.flatMap((candidate) => candidate.warnings),
    ],
  }
}
