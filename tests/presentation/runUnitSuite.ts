import {
  PRESENTATION_UNAVAILABLE,
  formatCompactCount,
  formatCounterEvidenceStrength,
  formatConfidencePrimary,
  formatConfidenceTechnical,
  formatCoverageSemantic,
  formatDirectionalFlow,
  formatEtfUsdMillions,
  formatFundingRate,
  formatProbability,
  formatPrice,
  formatSignedOpenInterestChange,
  formatSignedReturn,
} from "@/lib/presentation/financialFormatting"
import { HUMAN_REASON_DICTIONARY, REASON_DICTIONARY_VERSION, UNMAPPED_REASON_CODE, humanReasonFor } from "@/lib/presentation/reasonDictionary"

const checks: Array<readonly [string, boolean]> = []
const check = (name: string, pass: boolean) => checks.push([name, pass])

check("probability uses two decimals", formatProbability(0.12345) === "12.35%")
check("probability rejects invalid and preserves tiny values", formatProbability(Number.NaN) === PRESENTATION_UNAVAILABLE && formatProbability(0.000001) === "<0.01%")
check("signed return and OI use two decimals", formatSignedReturn(1.234) === "+1.23%" && formatSignedOpenInterestChange(-2) === "-2.00%")
check("signed values normalize negative zero", formatSignedReturn(-0) === "0.00%" && formatSignedOpenInterestChange(-0.00001) === "-<0.01%")
check("funding uses four decimals", formatFundingRate(0.00012345) === "+0.0123%" && formatFundingRate(-0.000000001) === "-<0.0001%")
check("flow includes direction and two decimals", formatDirectionalFlow(0.125) === "Buy-biased 12.50%" && formatDirectionalFlow(-0.125) === "Sell-biased 12.50%" && formatDirectionalFlow(0) === "Balanced 0.00%")
check("ETF USD uses signed millions", formatEtfUsdMillions(12_345_678) === "+$12.3M" && formatEtfUsdMillions(-1) === "-<$0.1M")
check("coverage is semantic and fail-closed", formatCoverageSemantic("COMPLETE") === "Complete" && formatCoverageSemantic("GAP") === "Gap" && formatCoverageSemantic("UNKNOWN") === PRESENTATION_UNAVAILABLE)
check("confidence separates semantic and technical output", formatConfidencePrimary("HIGH") === "Evidence strength: High" && formatConfidenceTechnical(0.875) === "87.50%" && formatConfidencePrimary("UNKNOWN") === "Evidence strength: Unavailable")
check("compact counts are stable", formatCompactCount(999) === "999" && formatCompactCount(1_250) === "1.3K" && formatCompactCount(2_500_000) === "2.5M")
check("prices and counter evidence are human readable", formatPrice(67891.23456) === "67,891.23" && formatCounterEvidenceStrength(0.6) === "Moderate")
check("missing and non-finite values fail closed", formatCompactCount(Infinity) === PRESENTATION_UNAVAILABLE && formatEtfUsdMillions(null) === PRESENTATION_UNAVAILABLE)
check("reason dictionary is versioned and mapped", HUMAN_REASON_DICTIONARY.FUNDING_MATERIALLY_POSITIVE.dictionaryVersion === REASON_DICTIONARY_VERSION && humanReasonFor("FUNDING_MATERIALLY_POSITIVE").text === "Funding was materially positive.")
check("unknown reason codes fail closed", humanReasonFor("FUTURE_REASON_CODE").code === UNMAPPED_REASON_CODE)

const failures = checks.filter(([, pass]) => !pass)
console.log(`PRESENTATION UNIT SUITE: ${failures.length ? "FAIL" : "PASS"}`)
for (const [name, pass] of checks) console.log(`[${pass ? "PASS" : "FAIL"}] ${name}`)
if (failures.length) process.exitCode = 1
