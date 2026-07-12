import { generateCanonicalIdentity } from "@/lib/data-platform/contracts"
const rule = { ruleId: "funding-v1", requiredFields: ["datasetId", "venue", "symbol", "eventTime", "schemaVersion"], includeProviderIdentity: false } as const
export const identityA = generateCanonicalIdentity({ datasetId: "funding", venue: "binance", symbol: "btcusdt", eventTime: 0, schemaVersion: "1" }, rule)
export const identityB = generateCanonicalIdentity({ datasetId: "funding", venue: "BINANCE", symbol: "BTCUSDT", eventTime: "1970-01-01T00:00:00.000Z", schemaVersion: "1" }, rule)
export const identityC = generateCanonicalIdentity({ datasetId: "funding", venue: "BINANCE", symbol: "ETHUSDT", eventTime: 0, schemaVersion: "1" }, rule)
