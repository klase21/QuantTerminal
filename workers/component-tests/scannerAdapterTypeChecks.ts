import type {
  InvestigationCandidateViewModel,
  ScannerSummaryViewModel,
  ScannerV2ViewModel,
} from "@/lib/scanner-presentation/contracts"
import { buildScannerV2ViewModel } from "@/lib/scanner-presentation/adapters"

type Assert<T extends true> = T
type IsAssignable<A, B> = A extends B ? true : false

type _SummaryPresent = Assert<IsAssignable<ScannerV2ViewModel["summary"], ScannerSummaryViewModel>>
type _CandidatePresent = Assert<IsAssignable<NonNullable<ScannerV2ViewModel["primaryCandidate"]>, InvestigationCandidateViewModel>>
type _ConfidenceUnavailable = Assert<IsAssignable<InvestigationCandidateViewModel["confidence"]["state"], "UNAVAILABLE">>
type _IdentityUnavailable = Assert<IsAssignable<InvestigationCandidateViewModel["identity"]["durableCandidateId"], null>>

const model = buildScannerV2ViewModel({
  moverRequest: { loading: false, error: null, hasPayload: false, lastUpdatedAt: null },
  opportunityRequest: { loading: false, error: null, hasPayload: false, lastUpdatedAt: null },
  candidates: [],
  inheritedMarketsContext: { label: "UNAVAILABLE", detail: "No context supplied." },
})

if (model.capabilities.selectionSupported || model.capabilities.filtersSupported) throw new Error("Scanner capabilities must remain disabled in R5.")
console.log("SCANNER ADAPTER TYPE CHECKS: PASS")
