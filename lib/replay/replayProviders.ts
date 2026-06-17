import type { ExchangeAwareInstrument, ExchangeId } from "@/types/exchange"

export type ReplayProviderId = "historical-storage" | "future-cryptohftdata"

export type ReplayProviderStatus = {
  id: ReplayProviderId
  label: string
  connected: boolean
  reason: string
}

export type ReplayLoadRequest = {
  provider: ReplayProviderId
  instrument: ExchangeAwareInstrument
  date: string
  time: string
}

export type ReplaySourceStatus = {
  status: "unavailable"
  provider: ReplayProviderStatus
  reason: string
}

export interface ReplayProvider {
  id: ReplayProviderId
  label: string
  supportedExchanges: ExchangeId[]
  status(): ReplayProviderStatus
  load(request: ReplayLoadRequest): ReplaySourceStatus
}

export class HistoricalReplayProvider implements ReplayProvider {
  id: ReplayProviderId = "historical-storage"
  label = "Historical Storage"
  supportedExchanges: ExchangeId[] = ["binance"]

  status(): ReplayProviderStatus {
    return {
      id: this.id,
      label: this.label,
      connected: false,
      reason: "Replay provider not connected. Historical storage is available for analogs, not tick-level replay.",
    }
  }

  load(): ReplaySourceStatus {
    const provider = this.status()
    return {
      status: "unavailable",
      provider,
      reason: provider.reason,
    }
  }
}

export class FutureCryptoHFTProvider implements ReplayProvider {
  id: ReplayProviderId = "future-cryptohftdata"
  label = "CryptoHFTData"
  supportedExchanges: ExchangeId[] = ["binance", "bybit", "hyperliquid", "deribit"]

  status(): ReplayProviderStatus {
    return {
      id: this.id,
      label: this.label,
      connected: false,
      reason: "CryptoHFTData adapter is not connected and no API key is configured.",
    }
  }

  load(): ReplaySourceStatus {
    const provider = this.status()
    return {
      status: "unavailable",
      provider,
      reason: provider.reason,
    }
  }
}

export const replayProviders = [
  new HistoricalReplayProvider(),
  new FutureCryptoHFTProvider(),
] as const

export function getReplayProvider(id: ReplayProviderId): ReplayProvider {
  return replayProviders.find((provider) => provider.id === id) ?? replayProviders[0]
}
