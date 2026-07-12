import type { CanonicalCommitResult, LineageEdge, SupersessionReference } from "@/lib/data-platform/persistence"

const result: CanonicalCommitResult = { status: "RETRYABLE_FAILURE", code: "DEADLOCK", retryWithSameIdempotencyKey: true }
const lineage: LineageEdge = { edgeId: "edge-1", source: { nodeType: "RAW_OBJECT", nodeId: "raw-1", nodeVersion: "sha256" }, destination: { nodeType: "CANONICAL_FACT", nodeId: "record-1", nodeVersion: "1" }, relationship: "NORMALIZED_FROM", commitId: "commit-1", createdAt: "2026-07-12T00:00:00.000Z", digest: null }
const supersession: SupersessionReference = { supersessionId: "sup-1", canonicalRecordId: "record-1", predecessorVersion: 1, successorVersion: 2, successorCommitId: "commit-2", createdAt: "2026-07-12T00:00:00.000Z" }
void result; void lineage; void supersession

// @ts-expect-error Conflict is a distinct result and cannot be represented as duplicate.
const invalidConflict: CanonicalCommitResult = { status: "DUPLICATE", conflict: {} }
// @ts-expect-error Supersession is not a lineage relationship.
const invalidLineage: LineageEdge = { ...lineage, relationship: "SUPERSEDES" }
void invalidConflict; void invalidLineage
