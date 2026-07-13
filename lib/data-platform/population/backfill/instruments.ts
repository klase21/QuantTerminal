import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { InstrumentLifecycleRecord } from "./contracts"

const EVIDENCE = "https://fapi.binance.com/fapi/v1/exchangeInfo retrieved 2026-07-13; current QuantTerminal focus selectors"
const seeds = [
  ["BNB", "BNBUSDT", "2020-02-10T08:00:00.000Z"],
  ["BTC", "BTCUSDT", "2019-09-08T17:55:00.000Z"],
  ["DOGE", "DOGEUSDT", "2020-07-10T09:00:00.000Z"],
  ["ETH", "ETHUSDT", "2019-11-27T07:45:00.000Z"],
  ["SOL", "SOLUSDT", "2020-09-14T07:00:00.000Z"],
  ["XRP", "XRPUSDT", "2020-01-06T08:20:00.000Z"],
] as const

export function buildInstrumentLifecycleInventory(): readonly InstrumentLifecycleRecord[] {
  return Object.freeze(seeds.map(([baseAsset, providerSymbol]) => {
    const activatedAt = seeds.find((seed) => seed[1] === providerSymbol)?.[2]
    if (!activatedAt) throw new Error("INSTRUMENT_ACTIVATION_MISSING")
    const canonicalInstrumentId = `binance-usdm-perpetual:${baseAsset}-USDT`
    const identity = [canonicalInstrumentId, "binance-futures-api", providerSymbol, "BINANCE", "USD_M_FUTURES", "PERPETUAL", baseAsset, "USDT", activatedAt, null, null, EVIDENCE, "ACTIVE"]
    return Object.freeze({ canonicalInstrumentId, providerId: "binance-futures-api", providerSymbol, venue: "BINANCE", marketType: "FUTURES", contractType: "PERPETUAL", baseAsset, quoteAsset: "USDT", activatedAt, deactivatedAt: null, replacementInstrumentId: null, lifecycleEvidence: EVIDENCE, lifecycleChecksum: canonicalChecksum(identity), supportStatus: "ACTIVE" })
  }))
}
