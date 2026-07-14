import { DATASET_REGISTRY, MVP_CERTIFICATION_PROFILE, MVP_DATASET_IDENTITY_BINDINGS, MVP_FIVE_MINUTE_SEMANTIC, evaluateMvpPublicationEligibility, requireMvpDatasetIdentity, resolveMvpDatasetId, resolveMvpFiveMinuteGranularity } from "@/lib/data-platform/registry"

let failures = 0
function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} ${name}`)
  if (!condition) failures += 1
}
function rejects(name: string, action: () => unknown, code: string) {
  try { action(); check(name, false) } catch (error) { check(name, error instanceof Error && error.message.startsWith(code)) }
}

const registry = new Map(DATASET_REGISTRY.map((entry) => [entry.datasetId, entry]))
check("historical OHLCV registry identity remains unchanged", registry.get("ohlcv")?.replayCapability.granularity === "ONE_MINUTE" && registry.get("ohlcv")?.primaryProvider === "binance-futures-api")
check("MVP OHLCV binding governs persisted five-minute archive truth", MVP_DATASET_IDENTITY_BINDINGS.find((item) => item.datasetId === "ohlcv")?.providerIds.includes("binance-public-archive") === true)
check("MVP Funding binding governs archive and REST source identities", MVP_DATASET_IDENTITY_BINDINGS.find((item) => item.datasetId === "funding")?.providerIds.includes("binance-vision") === true && MVP_DATASET_IDENTITY_BINDINGS.find((item) => item.datasetId === "funding")?.providerIds.includes("binance-official-rest-funding-rate") === true)
check("MVP OI binding governs persisted archive identity", MVP_DATASET_IDENTITY_BINDINGS.find((item) => item.datasetId === "open-interest")?.providerIds.includes("binance-vision") === true)
check("MVP AggTrades binding governs Segment archive identity", MVP_DATASET_IDENTITY_BINDINGS.find((item) => item.datasetId === "agg-trade")?.providerIds.includes("binance-public-archive") === true)

check("legacy dataset aliases resolve deterministically", resolveMvpDatasetId("OHLCV_5M") === "ohlcv" && resolveMvpDatasetId("open_interest") === "open-interest" && resolveMvpDatasetId("agg_trade") === "agg-trade")
check("five-minute aliases share one semantic", ["5m", "PT5M", "FIVE_MINUTE", "FIVE_MINUTES"].every((value) => resolveMvpFiveMinuteGranularity(value) === MVP_FIVE_MINUTE_SEMANTIC))
check("complete persisted tuple resolves", requireMvpDatasetIdentity({ datasetId: "OPEN_INTEREST_5M", providerId: "binance-vision", venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT", granularity: "PT5M" }).datasetId === "open-interest")

rejects("unknown dataset fails closed", () => resolveMvpDatasetId("prices"), "MVP_DATASET_ID_UNGOVERNED")
rejects("one-minute substitution fails closed", () => resolveMvpFiveMinuteGranularity("1m"), "MVP_GRANULARITY_UNGOVERNED")
rejects("unknown provider fails closed", () => requireMvpDatasetIdentity({ datasetId: "ohlcv", providerId: "display-binance", venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT", granularity: "5m" }), "MVP_PROVIDER_ID_UNGOVERNED")
rejects("venue substitution fails closed", () => requireMvpDatasetIdentity({ datasetId: "ohlcv", providerId: "binance-public-archive", venue: "binance_futures", marketType: "USD_M_FUTURES", canonicalInstrumentId: "binance-usdm-perpetual:BTC-USDT", granularity: "5m" }), "MVP_VENUE_UNGOVERNED")
rejects("unknown instrument fails closed", () => requireMvpDatasetIdentity({ datasetId: "ohlcv", providerId: "binance-public-archive", venue: "BINANCE", marketType: "USD_M_FUTURES", canonicalInstrumentId: "binance-usdm-perpetual:ADA-USDT", granularity: "5m" }), "MVP_INSTRUMENT_ID_UNGOVERNED")

const eligible = evaluateMvpPublicationEligibility({ authoritativePersistence: true, sourceAndIdentityValid: true, lineagePresent: true, coverageEligible: true, conflictPresent: false, timestampsValid: true, datasetRegistryGoverned: true, granularityGoverned: true, validationAcceptable: true })
check("complete slice is eligible without publishing", eligible.status === "ELIGIBLE" && MVP_CERTIFICATION_PROFILE.repositoryPublicationStateForEligible === "PENDING" && MVP_CERTIFICATION_PROFILE.futureRepositoryCertificationState === "CERTIFIED" && MVP_CERTIFICATION_PROFILE.consumerPublicationState === "NOT_PUBLISHED")
check("missing lineage is withheld", evaluateMvpPublicationEligibility({ authoritativePersistence: true, sourceAndIdentityValid: true, lineagePresent: false, coverageEligible: true, conflictPresent: false, timestampsValid: true, datasetRegistryGoverned: true, granularityGoverned: true, validationAcceptable: true }).status === "WITHHELD")
check("conflict is rejected", evaluateMvpPublicationEligibility({ authoritativePersistence: true, sourceAndIdentityValid: true, lineagePresent: true, coverageEligible: true, conflictPresent: true, timestampsValid: true, datasetRegistryGoverned: true, granularityGoverned: true, validationAcceptable: true }).status === "REJECTED")

if (failures) process.exitCode = 1
