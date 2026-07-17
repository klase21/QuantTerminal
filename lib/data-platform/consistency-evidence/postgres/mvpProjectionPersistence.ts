import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  generateMvpProjectionCorpus,
  verifyMvpProjection,
  type MvpProjectionEvidenceInput,
  type MvpProjectionKind,
  type MvpProjectionVersion,
} from "@/lib/data-platform/evidence-platform"
import { MvpProjectionStore } from "./mvpProjectionStore"

export interface BoundedProjectionRequest {
  readonly instrument: string
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly evidenceIdentity: string
  readonly evidenceChecksum: string
  readonly requestedProjectionKinds: readonly MvpProjectionKind[]
  readonly modelVersion: string
  readonly modelChecksum: string
  readonly schemaVersion: string
}

export async function persistMvpProjectionBatch(store: MvpProjectionStore, projections: readonly MvpProjectionVersion[]) {
  const statuses: Array<"CREATED" | "DUPLICATE"> = []
  for (const projection of projections) {
    const outcome = await store.write(projection)
    if (outcome.status === "CONFLICT") return Object.freeze({ status: "CONFLICT" as const, projections: Object.freeze(projections), statuses: Object.freeze(statuses) })
    statuses.push(outcome.status)
  }
  return Object.freeze({ status: statuses.some((value) => value === "CREATED") ? "CREATED" as const : "DUPLICATE" as const, projections: Object.freeze(projections), statuses: Object.freeze(statuses) })
}

export async function persistBoundedMvpProjections(input: { readonly request: BoundedProjectionRequest; readonly evidence: MvpProjectionEvidenceInput; readonly store: MvpProjectionStore }) {
  const { request, evidence } = input
  if (evidence.assessment.instrument !== request.instrument || evidence.assessment.eventTimeStart !== request.eventTimeStart || evidence.assessment.eventTimeEnd !== request.eventTimeEnd) throw new Error("BOUNDED_PROJECTION_WINDOW_MISMATCH")
  if (evidence.packetVersionId !== request.evidenceIdentity || evidence.packetChecksum !== request.evidenceChecksum || !/^[0-9a-f]{64}$/.test(request.evidenceChecksum)) throw new Error("BOUNDED_PROJECTION_EVIDENCE_INVALID")
  if (!request.requestedProjectionKinds.length || !request.modelVersion || !request.schemaVersion || !/^[0-9a-f]{64}$/.test(request.modelChecksum)) throw new Error("BOUNDED_PROJECTION_CONTRACT_INVALID")
  const generated = generateMvpProjectionCorpus([evidence]).filter((value) => request.requestedProjectionKinds.includes(value.projectionKind))
  const generatedKinds = new Set(generated.map((value) => value.projectionKind))
  if (request.requestedProjectionKinds.some((kind) => !generatedKinds.has(kind)) || generated.some((value) => !verifyMvpProjection(value))) return Object.freeze({ status: "INELIGIBLE" as const, projections: Object.freeze([] as MvpProjectionVersion[]), statuses: Object.freeze([] as string[]), checksum: canonicalChecksum({ request, reason: "REQUESTED_KIND_NOT_GENERATED" }) })
  const persisted = await persistMvpProjectionBatch(input.store, generated)
  return Object.freeze({ ...persisted, checksum: canonicalChecksum({ request, projections: generated.map((value) => [value.projectionVersionId, value.projectionChecksum]) }) })
}
