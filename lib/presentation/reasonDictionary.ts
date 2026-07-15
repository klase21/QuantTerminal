export const REASON_DICTIONARY_VERSION = "1.0.0" as const
export const UNMAPPED_REASON_CODE = "UNMAPPED_REASON_CODE" as const

export interface HumanReason {
  readonly code: string
  readonly label: string
  readonly explanation: string
  readonly text: string
  readonly severity: "INFO" | "CAUTION" | "LIMITATION"
  readonly weakensConclusion: boolean
  readonly relationship: "SUPPORTS" | "OPPOSES" | "LIMITS" | "NEUTRAL"
  readonly technicalCode: string
  readonly dictionaryVersion: typeof REASON_DICTIONARY_VERSION
}

const entries: Record<string, string | readonly [string, string, HumanReason["severity"], boolean, HumanReason["relationship"]]> = {
  NO_FABRICATED_LEVEL: ["No reliable price level is available.", "The evidence does not support presenting a specific entry, target, or invalidation price.", "LIMITATION", true, "LIMITS"],
  EVIDENCE_STRENGTH_NOT_PROBABILITY: ["Evidence strength, not forecast probability.", "This classification describes the quality of current evidence and does not predict future returns.", "INFO", false, "NEUTRAL"],
  FLOW_IMBALANCE_CONDITION_NOT_MET: ["Order flow is balanced.", "Aggressive buying and selling were not meaningfully skewed.", "INFO", false, "NEUTRAL"],
  FUNDING_BELOW_PRESSURE_THRESHOLD: ["Funding pressure is limited.", "Funding remained below the governed overheating threshold.", "INFO", false, "NEUTRAL"],
  REQUIRED_OHLCV_OR_OI_UNAVAILABLE: "Required price or open-interest data is unavailable.",
  OI_MATERIALLY_EXPANDED: "Open interest expanded materially.",
  OI_MATERIALLY_CONTRACTED: "Open interest contracted materially.",
  PRICE_ROSE: "Price rose during the observation window.",
  PRICE_FELL: "Price fell during the observation window.",
  PRICE_FLAT: "Price was effectively flat during the observation window.",
  PRICE_OI_DIRECTION_DIVERGED: "Price and open interest moved in opposite directions.",
  NO_PRICE_OI_DIVERGENCE: "Price and open interest did not diverge.",
  OI_CHANGE_WITHIN_BASELINE: "Open-interest change remained within its baseline range.",
  OI_CHANGE_BELOW_MATERIAL_THRESHOLD: "Open-interest change did not reach the material threshold.",
  REQUIRED_FUNDING_UNAVAILABLE: "Required funding data is unavailable.",
  FUNDING_MATERIALLY_POSITIVE: "Funding was materially positive.",
  FUNDING_MATERIALLY_NEGATIVE: "Funding was materially negative.",
  FUNDING_NORMALIZING: "Funding is normalizing toward its baseline.",
  FUNDING_NOT_NORMALIZING: "Funding is not normalizing toward its baseline.",
  FUNDING_WITHIN_BASELINE: "Funding remained within its baseline range.",
  AGGTRADES_OPTIONAL_ENRICHMENT_UNAVAILABLE: "Aggressive-trade enrichment is unavailable.",
  AGGRESSIVE_BUY_QUANTITY_DOMINATED: "Aggressive buy quantity dominated.",
  AGGRESSIVE_SELL_QUANTITY_DOMINATED: "Aggressive sell quantity dominated.",
  TRADE_COUNT_INTENSITY_SUFFICIENT: "Trade-count intensity was sufficient.",
  TRADE_COUNT_BELOW_BASELINE: "Trade-count intensity was below baseline.",
  TRADE_COUNT_AT_OR_ABOVE_BASELINE: "Trade-count intensity was at or above baseline.",
  AGGRESSIVE_FLOW_BALANCED: "Aggressive flow was balanced.",
  TRADE_COUNT_INTENSITY_LOW: "Trade-count intensity was low.",
  MINIMUM_MULTIFACTOR_INPUTS_UNAVAILABLE: "Minimum multi-factor inputs are unavailable.",
  OI_EXPANSION_CONFIRMED: "Open-interest expansion was confirmed.",
  FUNDING_PRESSURE_CONFIRMED: "Funding pressure was confirmed.",
  AGGRESSIVE_FLOW_CONFIRMED: "Aggressive flow confirmed the move.",
  PRICE_MOVEMENT_CONFIRMED: "Price movement confirmed the condition.",
  NO_FLOW_DIVERGENCE: "No aggressive-flow divergence was observed.",
  AGGTRADES_DID_NOT_CONFIRM: "Aggressive trades did not confirm the condition.",
  OI_EXPANSION_NOT_CONFIRMED: "Open-interest expansion was not confirmed.",
  FUNDING_PRESSURE_NOT_CONFIRMED: "Funding pressure was not confirmed.",
  PRICE_AND_FLOW_CONFIRMATION_ABSENT: "Price and flow confirmation were absent.",
  MULTIFACTOR_OVERHEATING_THRESHOLD_NOT_MET: ["Overheating conditions are incomplete.", "The required price, positioning, Funding, and order-flow conditions were not all present together.", "INFO", true, "OPPOSES"],
  MINIMUM_NORMALIZATION_INPUTS_UNAVAILABLE: "Minimum normalization inputs are unavailable.",
  FUNDING_NORMALIZED: "Funding normalized toward its baseline.",
  MARKET_MOVEMENT_STABILIZED: "Market movement stabilized.",
  AGGRESSIVE_FLOW_REMAINS_IMBALANCED: "Aggressive flow remains imbalanced.",
  NO_STRONG_FLOW_OPPOSITION: "No strong opposing flow was observed.",
  OI_CONTRACTION_NOT_MATERIAL: "Open-interest contraction was not material.",
  NORMALIZATION_CONFIRMATION_ABSENT: "Normalization confirmation was absent.",
  DELEVERAGING_CONDITION_NOT_MET: "The deleveraging condition was not met.",
  LIQUIDATION_ENRICHMENT_NOT_REQUIRED: "Liquidation enrichment is optional and was not required.",
  ORDERBOOK_ENRICHMENT_NOT_REQUIRED: "Order-book enrichment is optional and was not required.",
}

export type ReasonCode = keyof typeof entries

export const HUMAN_REASON_DICTIONARY: Readonly<Record<ReasonCode, HumanReason>> = Object.freeze(
  Object.fromEntries(Object.entries(entries).map(([code, value]) => {
    const [label, explanation, severity, weakensConclusion, relationship] = typeof value === "string" ? [value, value, "INFO" as const, false, "NEUTRAL" as const] : value
    return [code, Object.freeze({ code, label, explanation, text: label, severity, weakensConclusion, relationship, technicalCode: code, dictionaryVersion: REASON_DICTIONARY_VERSION })]
  })) as Record<ReasonCode, HumanReason>,
)

export function humanReasonFor(code: unknown): HumanReason {
  if (typeof code === "string" && code in HUMAN_REASON_DICTIONARY) return HUMAN_REASON_DICTIONARY[code as ReasonCode]
  return Object.freeze({ code: UNMAPPED_REASON_CODE, label: "Reason mapping required.", explanation: "This governed reason is not mapped in the current presentation dictionary and remains visible for QA.", text: "Reason mapping required.", severity: "LIMITATION", weakensConclusion: true, relationship: "LIMITS", technicalCode: typeof code === "string" ? code : "UNKNOWN", dictionaryVersion: REASON_DICTIONARY_VERSION })
}
