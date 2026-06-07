import { mockMarketMemoryRepository } from "./marketMemoryRepository"
import type { MarketMemoryQuery, MarketMemorySnapshot } from "./marketMemoryTypes"

export function getMarketMemory(query?: MarketMemoryQuery): MarketMemorySnapshot {
  return mockMarketMemoryRepository.getMarketMemory(query)
}
