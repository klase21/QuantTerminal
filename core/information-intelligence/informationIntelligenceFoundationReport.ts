import { defaultInformationScoreWeights } from "./informationScoringTypes"
import { informationSourceClassifications } from "./informationSourceTypes"

export const informationIntelligenceFoundationReport = {
  objective:
    "Information Intelligence evaluates whether market information is reliable, spreading, narrative-forming, market-relevant, and new.",
  evaluationQuestions: [
    "Is this information reliable?",
    "Is it spreading?",
    "Is it creating a narrative?",
    "Does it matter?",
    "Is it new?",
  ],
  scoringDimensions: {
    reliability: "Source reputation, historical accuracy, corroboration, and consistency.",
    attention: "Velocity, mentions, spread, and cross-platform presence.",
    narrative: "Narrative stage, coherence, persistence, and contradiction level.",
    impact: "Price, volume, volatility, and sentiment association.",
    novelty: "First-seen distance, uniqueness, repetition penalty, and saturation state.",
  },
  defaultWeights: defaultInformationScoreWeights,
  scoreCombination:
    "Composite Intelligence Score combines reliability, attention, narrative, impact, and novelty. Reliability and impact carry the highest default weight because QuantTerminal should avoid overreacting to noisy but viral information.",
  futureAdapterInputs: [
    "source identity",
    "published timestamp",
    "first seen timestamp",
    "raw text or summary",
    "engagement or mention counts",
    "cross-platform references",
    "source URL or provider id",
    "asset and narrative tags",
    "market reaction window",
  ],
  futureSourceMapping: informationSourceClassifications.map((source) => ({
    provider: source.provider,
    category: source.category,
    role: source.expectedStrengths.join(", "),
    primaryRisk: source.expectedWeaknesses[0],
  })),
  referenceUse:
    "The last30days-skill repository was used only as conceptual reference for multi-platform attention and money-backed expectation signals. No implementation, adapter code, or dependency was copied.",
} as const

