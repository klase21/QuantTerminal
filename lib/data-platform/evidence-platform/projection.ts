export type ConsumerProjectionKind = "DASHBOARD" | "REPLAY" | "RESEARCH" | "MARKETS" | "SCANNER" | "TRADE"
export interface ExplainabilityProjectionContract {
  readonly conclusionCodes: readonly string[]; readonly reasonCodes: readonly string[]
  readonly supportingEvidenceReferenceIds: readonly string[]; readonly conflictingEvidenceReferenceIds: readonly string[]
  readonly canonicalFactReferenceIds: readonly string[]; readonly rawArtifactLineageNodeIds: readonly string[]
}
export interface ConsumerProjectionDefinition {
  readonly projectionId: string; readonly projectionVersion: string; readonly consumer: ConsumerProjectionKind
  readonly sourceProfileIds: readonly string[]; readonly outputSchemaVersion: string
  readonly explainabilityRequired: true; readonly mayReclassifyEvidence: false; readonly mayReconstructEvidence: false
  readonly state: "PROPOSED" | "APPROVED" | "SUSPENDED"
}
export const CONSUMER_PROJECTION_REGISTRY: readonly ConsumerProjectionDefinition[] = Object.freeze(
  (["DASHBOARD", "REPLAY", "RESEARCH", "MARKETS", "SCANNER", "TRADE"] as const).map((consumer): ConsumerProjectionDefinition => ({
    projectionId: "d4.consumer." + consumer.toLowerCase(), projectionVersion: "1.0.0", consumer,
    sourceProfileIds: [], outputSchemaVersion: "1.0.0", explainabilityRequired: true,
    mayReclassifyEvidence: false, mayReconstructEvidence: false, state: "PROPOSED",
  })),
)
