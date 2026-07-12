import { competingCorrections, validateLineageEdge, validateSupersession, type LineageEdge, type SupersessionReference } from "@/lib/data-platform/persistence"
const baseSupersession: SupersessionReference = { supersessionId: "s1", canonicalRecordId: "r1", predecessorVersion: 1, successorVersion: 2, successorCommitId: "c2", createdAt: "2026-07-12T00:00:00.000Z" }
export const validSupersessionPasses = validateSupersession(baseSupersession).length === 0
export const selfOrReverseSupersessionFails = validateSupersession({ ...baseSupersession, successorVersion: 1 }).includes("NON_MONOTONIC_SUPERSESSION")
export const competingCorrectionDetected = competingCorrections(baseSupersession, { ...baseSupersession, supersessionId: "s2", successorCommitId: "c3" })
const edge: LineageEdge = { edgeId: "e1", source: { nodeType: "RAW_OBJECT", nodeId: "raw", nodeVersion: "hash" }, destination: { nodeType: "CANONICAL_FACT", nodeId: "rec", nodeVersion: "1" }, relationship: "NORMALIZED_FROM", commitId: "c1", createdAt: "2026-07-12T00:00:00.000Z", digest: null }
export const validLineagePasses = validateLineageEdge(edge).length === 0
export const selfEdgeFails = validateLineageEdge({ ...edge, source: { nodeType: "CANONICAL_FACT", nodeId: "rec", nodeVersion: "1" } }).includes("SELF_EDGE")
export const reverseEdgeFails = validateLineageEdge({ ...edge, source: edge.destination, destination: edge.source, relationship: "PROJECTED_FROM" }).includes("REVERSE_OR_UNSUPPORTED_DIRECTION")
