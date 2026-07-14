export const MVP_IDENTITY_BINDING_VERSION = "1.0.0" as const
export const MVP_FIVE_MINUTE_SEMANTIC = Object.freeze({
  semanticId: "FIVE_MINUTE",
  canonicalToken: "5m",
  isoDuration: "PT5M",
  durationMilliseconds: 300_000,
})

export type MvpDatasetId = "ohlcv" | "funding" | "open-interest" | "agg-trade" | "liquidation" | "orderbook"
export type MvpTargetKind = "OHLCV" | "FUNDING" | "OPEN_INTEREST" | "STREAM_MANIFEST" | "LIQUIDATION"
export type MvpTimestampSemantic = "INTERVAL_START" | "PROVIDER_OBSERVATION_TIME" | "PROVIDER_EVENT_TIME" | "PROVIDER_BAR_TIMESTAMP" | "PROVIDER_EVENT_STREAM_TIME"

export interface MvpDatasetIdentityBinding {
  readonly datasetId: MvpDatasetId
  readonly targetKind: MvpTargetKind
  readonly providerIds: readonly string[]
  readonly venue: "BINANCE"
  readonly marketType: "USD_M_FUTURES"
  readonly granularity: "5m" | "EVENT_8H" | "tick"
  readonly timestampSemantic: MvpTimestampSemantic
  readonly normalizerId: string
  readonly certificationRequired: boolean
  readonly limitation: string | null
}

export const MVP_DATASET_IDENTITY_BINDINGS: readonly MvpDatasetIdentityBinding[] = Object.freeze([
  Object.freeze({ datasetId: "ohlcv", targetKind: "OHLCV", providerIds: Object.freeze(["binance-public-archive"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "5m", timestampSemantic: "INTERVAL_START", normalizerId: "d3-phase3-normalizer-v1", certificationRequired: true, limitation: null }),
  Object.freeze({ datasetId: "funding", targetKind: "FUNDING", providerIds: Object.freeze(["binance-vision", "binance-official-rest-funding-rate"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "EVENT_8H", timestampSemantic: "PROVIDER_EVENT_TIME", normalizerId: "d3-phase3-normalizer-v1", certificationRequired: true, limitation: null }),
  Object.freeze({ datasetId: "open-interest", targetKind: "OPEN_INTEREST", providerIds: Object.freeze(["binance-vision"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "5m", timestampSemantic: "PROVIDER_OBSERVATION_TIME", normalizerId: "d3-phase3-normalizer-v1", certificationRequired: true, limitation: null }),
  Object.freeze({ datasetId: "agg-trade", targetKind: "STREAM_MANIFEST", providerIds: Object.freeze(["binance-public-archive"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "tick", timestampSemantic: "PROVIDER_EVENT_STREAM_TIME", normalizerId: "d3-phase3-segment-normalizer-v1", certificationRequired: true, limitation: null }),
  Object.freeze({ datasetId: "liquidation", targetKind: "LIQUIDATION", providerIds: Object.freeze(["binance-futures-api", "coinalyze-internal-web"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "5m", timestampSemantic: "PROVIDER_BAR_TIMESTAMP", normalizerId: "legacy-liquidation-normalizer-v1", certificationRequired: false, limitation: "Coinalyze five-minute bars are experimental supplemental evidence, not canonical individual liquidation events." }),
  Object.freeze({ datasetId: "orderbook", targetKind: "STREAM_MANIFEST", providerIds: Object.freeze(["cryptohftdata"]), venue: "BINANCE", marketType: "USD_M_FUTURES", granularity: "tick", timestampSemantic: "PROVIDER_EVENT_STREAM_TIME", normalizerId: "orderbook-stream-normalizer-unapproved", certificationRequired: false, limitation: "Historical full-book reconstruction requires a certified snapshot boundary." }),
])

const DATASET_ALIASES = Object.freeze<Record<string, MvpDatasetId>>({
  ohlcv: "ohlcv", OHLCV: "ohlcv", OHLCV_5M: "ohlcv", market: "ohlcv", HISTORICAL_MARKET: "ohlcv",
  funding: "funding", FUNDING: "funding", HISTORICAL_FUNDING: "funding",
  "open-interest": "open-interest", OPEN_INTEREST: "open-interest", OPEN_INTEREST_5M: "open-interest", open_interest: "open-interest", HISTORICAL_OPEN_INTEREST: "open-interest",
  "agg-trade": "agg-trade", AGG_TRADE: "agg-trade", agg_trade: "agg-trade", HISTORICAL_AGG_TRADE: "agg-trade",
  liquidation: "liquidation", LIQUIDATION: "liquidation", HISTORICAL_LIQUIDATION: "liquidation",
  orderbook: "orderbook", ORDERBOOK: "orderbook", "orderbook-snapshot": "orderbook", "orderbook-replay": "orderbook",
})

const FIVE_MINUTE_ALIASES = new Set(["5m", "PT5M", "FIVE_MINUTE", "FIVE_MINUTES"])
export const MVP_CANONICAL_INSTRUMENT_IDS = Object.freeze([
  "binance-usdm-perpetual:BTC-USDT",
  "binance-usdm-perpetual:ETH-USDT",
  "binance-usdm-perpetual:SOL-USDT",
  "binance-usdm-perpetual:BNB-USDT",
  "binance-usdm-perpetual:XRP-USDT",
  "binance-usdm-perpetual:DOGE-USDT",
] as const)
const INSTRUMENT_IDS = new Set<string>(MVP_CANONICAL_INSTRUMENT_IDS)

export function resolveMvpDatasetId(value: string): MvpDatasetId {
  const resolved = DATASET_ALIASES[value]
  if (!resolved) throw new Error(`MVP_DATASET_ID_UNGOVERNED:${value}`)
  return resolved
}

export function resolveMvpFiveMinuteGranularity(value: string): typeof MVP_FIVE_MINUTE_SEMANTIC {
  if (!FIVE_MINUTE_ALIASES.has(value)) throw new Error(`MVP_GRANULARITY_UNGOVERNED:${value}`)
  return MVP_FIVE_MINUTE_SEMANTIC
}

export function requireMvpDatasetIdentity(input: {
  readonly datasetId: string
  readonly providerId: string
  readonly venue: string
  readonly marketType: string
  readonly canonicalInstrumentId: string
  readonly granularity: string
}): MvpDatasetIdentityBinding {
  const datasetId = resolveMvpDatasetId(input.datasetId)
  const binding = MVP_DATASET_IDENTITY_BINDINGS.find((entry) => entry.datasetId === datasetId)
  if (!binding) throw new Error(`MVP_DATASET_BINDING_MISSING:${datasetId}`)
  if (!binding.providerIds.includes(input.providerId)) throw new Error(`MVP_PROVIDER_ID_UNGOVERNED:${datasetId}:${input.providerId}`)
  if (input.venue !== binding.venue) throw new Error(`MVP_VENUE_UNGOVERNED:${input.venue}`)
  if (input.marketType !== binding.marketType) throw new Error(`MVP_MARKET_TYPE_UNGOVERNED:${input.marketType}`)
  if (!INSTRUMENT_IDS.has(input.canonicalInstrumentId)) throw new Error(`MVP_INSTRUMENT_ID_UNGOVERNED:${input.canonicalInstrumentId}`)
  if (binding.granularity === "5m") resolveMvpFiveMinuteGranularity(input.granularity)
  else if (input.granularity !== binding.granularity) throw new Error(`MVP_GRANULARITY_UNGOVERNED:${input.granularity}`)
  return binding
}
