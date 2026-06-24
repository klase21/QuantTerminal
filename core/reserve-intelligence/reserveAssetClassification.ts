import type {
  ReserveAssetClassification,
} from "./reserveIntelligenceTypes"

const STABLECOINS = new Set([
  "USDT",
  "USDC",
  "FDUSD",
  "TUSD",
  "USDS",
  "USDP",
  "USD1",
  "AEUR",
  "EURI",
  "RLUSD",
  "XUSD",
  "PYUSD",
])

const HARD_ASSETS = new Set([
  "BTC",
  "WBTC",
  "BCH",
  "LTC",
  "PAXG",
])

const EXCHANGE_ASSETS = new Set([
  "BNB",
])

const SMART_CONTRACT_ASSETS = new Set([
  "ETH",
  "WBETH",
  "SOL",
  "ADA",
  "AVAX",
  "DOT",
  "SUI",
  "APT",
  "ARB",
  "OP",
  "MATIC",
  "POL",
  "TRX",
  "NEAR",
  "ATOM",
  "ALGO",
  "HBAR",
  "XLM",
  "LINK",
])

export function classifyReserveAsset(asset: string): ReserveAssetClassification {
  const symbol = asset.trim().toUpperCase()
  if (STABLECOINS.has(symbol)) return "stablecoin"
  if (HARD_ASSETS.has(symbol)) return "hard_asset"
  if (EXCHANGE_ASSETS.has(symbol)) return "exchange_asset"
  if (SMART_CONTRACT_ASSETS.has(symbol)) return "smart_contract_asset"
  return "other"
}
