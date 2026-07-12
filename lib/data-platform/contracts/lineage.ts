export type LineageObjectType = "RAW_OBJECT" | "NORMALIZATION_RUN" | "CANONICAL_RECORD" | "QUALITY_EVALUATION" | "PROJECTION" | "EVIDENCE_PACKET" | "CANONICAL_SCOPE" | "CONSUMER_READ_MODEL"
export type LineageRelationship = "NORMALIZED_FROM" | "VALIDATED_BY" | "SUPERSEDES" | "PROJECTED_FROM" | "EVIDENCED_BY" | "PUBLISHED_IN" | "CONSUMED_BY"
export interface LineageObjectReference { objectType: LineageObjectType; objectId: string; version: string }
export interface LineageEdge { edgeId: string; source: LineageObjectReference; destination: LineageObjectReference; relationship: LineageRelationship; version: string; createdAt: string; processRunId: string; digest: string | null }
export function validateLineageEdge(edge: LineageEdge): boolean { return Boolean(edge.edgeId && edge.source.objectId && edge.destination.objectId && edge.processRunId && edge.createdAt) && edge.source.objectId !== edge.destination.objectId }
