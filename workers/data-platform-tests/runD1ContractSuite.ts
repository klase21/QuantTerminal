import { canonicalSerialize } from "@/lib/data-platform/contracts"
import { DATASET_REGISTRY, DERIVED_INTELLIGENCE_REGISTRY, PROVIDERS, QUALITY_POLICIES } from "@/lib/data-platform/registry"
import { certifiedProviderIsAdmissible } from "./providerCertificationTypeChecks"
import { identityA, identityB, identityC } from "./canonicalIdentityChecks"
import { checksumA, checksumB, epoch, serializationA, serializationB } from "./canonicalSerializationChecks"
import { compatibility, correctionValid } from "./versioningChecks"
import { replayValid } from "./replayCapabilityChecks"
import { dependencyValid } from "./datasetDependencyChecks"
import { watermarkValid } from "./watermarkChecks"
import { mandatoryNotEvaluatedFails, policiesValid } from "./dataQualityContractChecks"
import { checksumDecision, experimentalDecision, mismatchDecision, publishDecision } from "./publicationGateChecks"
import { quarantineValid, repairValid } from "./quarantineChecks"
import { compatible, incompatible } from "./canonicalScopeChecks"
import { lineageValid } from "./lineageChecks"
import { derivedRegistryValid } from "./derivedIntelligenceChecks"

const requiredDatasets = ["ohlcv", "funding", "open-interest", "liquidation", "agg-trade", "orderbook", "prediction-market", "etf-flow", "reserve", "macro", "research-document", "research-packet", "evidence-packet", "coverage-projection", "derived-market-intelligence", "population-job", "consistency-result"]
const checks: Array<[string, boolean]> = [
  ["complete dataset registry", requiredDatasets.every((id) => DATASET_REGISTRY.some((entry) => entry.datasetId === id))],
  ["exactly one canonical owner", DATASET_REGISTRY.every((entry) => entry.canonicalOwner.length > 0)],
  ["governance policies remain explicit", DATASET_REGISTRY.every((entry) => entry.operationalSla.state === "PROPOSED")],
  ["provider registry populated", PROVIDERS.length >= 5], ["provider admissibility", certifiedProviderIsAdmissible],
  ["identity deterministic", identityA.canonicalRecordIdentity === identityB.canonicalRecordIdentity], ["identity collision resistance fixture", identityA.canonicalRecordIdentity !== identityC.canonicalRecordIdentity],
  ["serialization deterministic", serializationA === serializationB], ["checksum deterministic", checksumA === checksumB], ["timestamp normalized", epoch === "1970-01-01T00:00:00.000Z"],
  ["version compatibility controlled", compatibility === "REQUIRES_RENORMALIZATION"], ["correction supersession valid", correctionValid], ["replay valid", replayValid], ["dependency valid", dependencyValid], ["watermark valid", watermarkValid],
  ["quality policies complete", QUALITY_POLICIES.length === 12 && policiesValid], ["mandatory NOT_EVALUATED fails", mandatoryNotEvaluatedFails],
  ["publish decision", publishDecision === "PUBLISH"], ["checksum quarantine", checksumDecision === "QUARANTINE"], ["consistency hold", mismatchDecision === "HOLD_FOR_REVIEW"], ["experimental hold", experimentalDecision === "HOLD_FOR_REVIEW"],
  ["quarantine lineage", quarantineValid], ["repair audit", repairValid], ["scope compatibility", compatible && incompatible], ["lineage edge", lineageValid],
  ["derived intelligence candidates", DERIVED_INTELLIGENCE_REGISTRY.length === 6 && derivedRegistryValid && DERIVED_INTELLIGENCE_REGISTRY.every((entry) => entry.status === "CANDIDATE")],
]

let unsupportedRejected = false
try { canonicalSerialize({ value: Number.NaN }) } catch { unsupportedRejected = true }
checks.push(["unsupported numeric rejection", unsupportedRejected])

const failures = checks.filter(([, pass]) => !pass)
console.log(`D1 CONTRACT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
