import type { LineageEdge, LineageNodeType } from "./contracts"

const ALLOWED = Object.freeze({
  RAW_OBJECT: Object.freeze(["CANONICAL_FACT"]), CANONICAL_FACT: Object.freeze(["PROJECTION_VERSION"]),
  PROJECTION_VERSION: Object.freeze(["EVIDENCE_PACKET"]), EVIDENCE_PACKET: Object.freeze([]),
} as const satisfies Record<LineageNodeType, readonly LineageNodeType[]>)

export function validateLineageEdge(edge: LineageEdge): readonly string[] {
  const errors: string[] = []
  if (edge.source.nodeType === edge.destination.nodeType && edge.source.nodeId === edge.destination.nodeId && edge.source.nodeVersion === edge.destination.nodeVersion) errors.push("SELF_EDGE")
  if (!(ALLOWED[edge.source.nodeType] as readonly LineageNodeType[]).includes(edge.destination.nodeType)) errors.push("REVERSE_OR_UNSUPPORTED_DIRECTION")
  if (!edge.edgeId || !edge.commitId || !edge.createdAt) errors.push("MISSING_EDGE_AUDIT_IDENTITY")
  return Object.freeze(errors)
}
