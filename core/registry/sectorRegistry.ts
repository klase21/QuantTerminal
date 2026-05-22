export type SectorId =
  | "AI"
  | "MEME"
  | "RWA"
  | "GAMING"
  | "DEFI"
  | "L1"
  | "INFRA"
  | "DEPIN"
  | "EXCHANGE"
  | "PAYFI"

export interface SectorDefinition {
  id: SectorId
  label: string
  aliases: string[]
  symbols: string[]
  weight: number
  description: string
}

export const SECTOR_REGISTRY: SectorDefinition[] = [
  {
    id: "AI",
    label: "AI",
    aliases: ["AI", "Artificial Intelligence", "Agents", "Compute"],
    symbols: ["TAO", "FET", "ASI", "RNDR", "RENDER", "NEAR", "WLD", "ARKM", "GRT", "AI", "NMR", "AGIX", "OCEAN"],
    weight: 1,
    description: "AI infrastructure, compute, data, agents, and model-adjacent narratives.",
  },
  {
    id: "MEME",
    label: "Meme",
    aliases: ["Meme", "Animal beta", "Retail beta"],
    symbols: ["DOGE", "SHIB", "PEPE", "BONK", "FLOKI", "WIF", "TURBO", "MEME", "BOME", "PENGU", "TRUMP"],
    weight: 0.95,
    description: "High-beta retail speculation and culture-driven flows.",
  },
  {
    id: "RWA",
    label: "RWA",
    aliases: ["Real World Assets", "Tokenization", "Yield rails"],
    symbols: ["ONDO", "PENDLE", "LINK", "OM", "POLYX", "MPL", "CFG", "TRU", "CPOOL", "PROPC"],
    weight: 0.9,
    description: "Tokenized assets, oracle rails, and real-world yield narratives.",
  },
  {
    id: "GAMING",
    label: "Gaming",
    aliases: ["Gaming", "Metaverse", "GameFi", "NFT beta"],
    symbols: ["IMX", "GALA", "SAND", "MANA", "AXS", "RON", "PIXEL", "YGG", "MAGIC", "ILV", "APE", "GMT"],
    weight: 0.8,
    description: "Gaming, NFT, and virtual-world speculation clusters.",
  },
  {
    id: "DEFI",
    label: "DeFi",
    aliases: ["DeFi", "Onchain finance", "DEX", "Lending"],
    symbols: ["UNI", "AAVE", "MKR", "ENA", "LDO", "CRV", "COMP", "SNX", "DYDX", "JTO", "JUP", "CAKE", "RAY", "GMX"],
    weight: 0.9,
    description: "Onchain financial primitives, lending, DEX, staking, and yield.",
  },
  {
    id: "L1",
    label: "L1",
    aliases: ["Layer 1", "Base chains", "Majors"],
    symbols: ["BTC", "ETH", "SOL", "BNB", "ADA", "AVAX", "SUI", "APT", "TON", "DOT", "ATOM", "SEI", "INJ", "TIA", "NEO", "XRP"],
    weight: 1,
    description: "Major base-layer chains and large-cap risk appetite.",
  },
  {
    id: "INFRA",
    label: "Infra",
    aliases: ["Infrastructure", "Middleware", "Interop", "Data availability"],
    symbols: ["AR", "FIL", "STORJ", "PYTH", "W", "ZRO", "STRK", "OP", "ARB", "MANTA", "ALT", "EIGEN", "CELO", "MINA"],
    weight: 0.85,
    description: "Crypto infrastructure, storage, interoperability, L2, and middleware rails.",
  },
  {
    id: "DEPIN",
    label: "DePIN",
    aliases: ["DePIN", "Physical infrastructure", "Wireless", "Compute networks"],
    symbols: ["HNT", "IOTX", "AKT", "IO", "GLM", "FLUX", "MOBILE", "DIMO", "NOS", "AIOZ"],
    weight: 0.8,
    description: "Decentralized physical infrastructure and compute/resource networks.",
  },
  {
    id: "EXCHANGE",
    label: "Exchange",
    aliases: ["Exchange", "CEX", "DEX beta", "Brokerage tokens"],
    symbols: ["BNB", "OKB", "BGB", "CRO", "GT", "KCS", "MX", "CAKE", "UNI", "DYDX", "RUNE"],
    weight: 0.75,
    description: "Centralized and decentralized exchange-linked assets.",
  },
  {
    id: "PAYFI",
    label: "PayFi",
    aliases: ["Payments", "Stablecoin rails", "Settlement", "PayFi"],
    symbols: ["XRP", "XLM", "HBAR", "ALGO", "CELO", "ACH", "AMP", "COTI", "XDC"],
    weight: 0.75,
    description: "Payment, settlement, remittance, and stablecoin-adjacent rails.",
  },
]

export const SECTOR_SYMBOL_MAP = Object.fromEntries(
  SECTOR_REGISTRY.flatMap((sector) => sector.symbols.map((symbol) => [symbol, sector.id]))
) as Record<string, SectorId>

export function normalizeAssetSymbol(symbol: string) {
  return symbol
    .replace(/^KRW-/, "")
    .replace(/USDT$|USDC$|BUSD$|FDUSD$|BTC$|USD$/g, "")
    .toUpperCase()
}

export function findSectorForSymbol(symbol: string): SectorId | null {
  const normalized = normalizeAssetSymbol(symbol)
  return SECTOR_SYMBOL_MAP[normalized] ?? null
}
