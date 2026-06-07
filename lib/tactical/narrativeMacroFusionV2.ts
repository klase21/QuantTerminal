import type { FlowIntelligenceResult } from "./flowIntelligenceEngine"
import type { MacroReasoningResult } from "./macroReasoningEngine"
import type { TacticalVerdictResult } from "./tacticalVerdictEngine"

export type NarrativeMacroFusionV2 = {
  headline: string
  conviction: "LOW" | "MEDIUM" | "HIGH"
  catalystStack: string[]
  reasoning: string
  executionImpact: string
}

export function buildNarrativeMacroFusionV2({
  tactical,
  macro,
  flow,
}: {
  tactical: TacticalVerdictResult
  macro: MacroReasoningResult
  flow: FlowIntelligenceResult
}): NarrativeMacroFusionV2 {
  const catalystStack: string[] = []

  if (tactical.opportunity.category !== "No Clean Setup") {
    catalystStack.push(`${tactical.opportunity.category} is the active tactical context.`)
  }

  if (macro.regime === "RISK-ON SUPPORTIVE") catalystStack.push("Macro backdrop supports selective risk exposure.")
  if (macro.regime === "RISK-OFF PRESSURE") catalystStack.push("Macro pressure limits clean upside continuation.")
  if (macro.regime === "LIQUIDITY STRESS") catalystStack.push("Liquidity stress increases execution risk.")

  if (flow.regime === "BUYER DOMINANT") catalystStack.push("Microstructure flow favors buyers.")
  if (flow.regime === "SELLER DOMINANT") catalystStack.push("Microstructure flow favors sellers.")
  if (flow.regime === "ABSORPTION WATCH") catalystStack.push("Absorption or trap risk is present.")
  if (flow.regime === "LIQUIDITY VACUUM") catalystStack.push("Liquidity vacuum risk can distort entries.")

  const alignment =
    (tactical.directionalBias === "LONG BIAS" && macro.tacticalBiasModifier === "SUPPORTS LONGS" && flow.microstructureBias === "LONG") ||
    (tactical.directionalBias === "SHORT BIAS" && macro.tacticalBiasModifier === "SUPPORTS SHORTS" && flow.microstructureBias === "SHORT")

  const conflict =
    tactical.directionalBias === "TWO-WAY" ||
    tactical.directionalBias === "NO EDGE" ||
    flow.regime === "ABSORPTION WATCH" ||
    flow.regime === "LIQUIDITY VACUUM"

  const conviction = alignment ? "HIGH" : conflict ? "LOW" : "MEDIUM"

  const headline =
    conviction === "HIGH"
      ? "Tactical, macro, and flow conditions are aligned."
      : conviction === "MEDIUM"
        ? "Tactical conditions are usable, but confirmation still matters."
        : "Narrative and execution conditions are not clean enough for aggressive entries."

  const reasoning =
    catalystStack.length > 0
      ? catalystStack.slice(0, 4).join(" ")
      : "No dominant catalyst stack is visible from the current tactical inputs."

  const executionImpact =
    conviction === "HIGH"
      ? "Execution Impact: directional setups can be considered if local liquidity confirms."
      : conviction === "MEDIUM"
        ? "Execution Impact: stay selective and require confirmation before increasing aggression."
        : "Execution Impact: avoid forcing trades; wait for cleaner alignment."

  return {
    headline,
    conviction,
    catalystStack: catalystStack.slice(0, 6),
    reasoning,
    executionImpact,
  }
}
