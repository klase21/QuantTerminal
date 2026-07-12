import type { PopulationJob, PopulationUnit, PopulationUnitIdentity } from "./contracts"
import { createPopulationUnitId } from "./identity"

export interface UnitSpecification extends PopulationUnitIdentity { readonly providerSnapshotId: string; readonly policyVersionId: string; readonly requestFingerprint: string; readonly requestParameters: Readonly<Record<string, string | number | boolean | null>>; readonly required: boolean }

export function expandPopulationUnits(job: PopulationJob, specifications: readonly UnitSpecification[], createdAt: string): readonly PopulationUnit[] {
  const units = new Map<string, PopulationUnit>()
  for (const spec of specifications) {
    const unitId = createPopulationUnitId(spec)
    const unit: PopulationUnit = { unitId, jobId: job.jobId, identity: { profileId: spec.profileId, profileVersion: spec.profileVersion, datasetId: spec.datasetId, providerId: spec.providerId, venue: spec.venue, subjectOrSymbol: spec.subjectOrSymbol, windowStart: spec.windowStart, windowEnd: spec.windowEnd, resolution: spec.resolution, partitionKey: spec.partitionKey }, providerSnapshotId: spec.providerSnapshotId, policyVersionId: spec.policyVersionId, requestFingerprint: spec.requestFingerprint, requestParameters: spec.requestParameters, required: spec.required, currentState: "PENDING", attemptCount: 0, activeLeaseId: null, currentCheckpointId: null, createdAt, updatedAt: createdAt }
    const existing = units.get(unitId)
    if (existing && JSON.stringify(existing.identity) !== JSON.stringify(unit.identity)) throw new Error("UNIT_IDENTITY_CONFLICT")
    units.set(unitId, Object.freeze(unit))
  }
  return Object.freeze([...units.values()])
}
