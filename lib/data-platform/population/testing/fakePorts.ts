import type { CanonicalCommitCommand, CanonicalCommitResult } from "@/lib/data-platform/persistence"
import type { CanonicalCommitPort, CandidateNormalizationInput, NormalizerRegistration, PopulationCandidate } from "../contracts"

export class DeterministicD2Port implements CanonicalCommitPort {
  private readonly results = new Map<string, CanonicalCommitResult>()
  constructor(private readonly resolve: (command: CanonicalCommitCommand) => CanonicalCommitResult) {}
  async execute(command: CanonicalCommitCommand): Promise<CanonicalCommitResult> { const existing = this.results.get(command.idempotencyKey); if (existing) return existing; const result = this.resolve(command); this.results.set(command.idempotencyKey, result); return result }
}

export class FixtureNormalizerRegistry {
  private readonly registrations = new Map<string, (input: CandidateNormalizationInput) => CanonicalCommitCommand>()
  register<K extends PopulationCandidate["kind"]>(registration: NormalizerRegistration<K>): void { this.registrations.set(`${registration.datasetId}:${registration.candidateKind}:${registration.normalizationVersion}`, (input) => registration.normalize(input as CandidateNormalizationInput & { readonly candidate: Extract<PopulationCandidate, { readonly kind: K }> })) }
  normalize(input: CandidateNormalizationInput): CanonicalCommitCommand {
    for (const value of [input.datasetRegistrySnapshotId,input.providerRegistrySnapshotId,input.providerCertificationSnapshotId,input.policyVersionId,input.schemaVersion,input.normalizationVersion,input.rawManifestId]) if (!value.trim()) throw new Error("NORMALIZATION_BINDING_MISSING")
    if (input.candidate.validationStatus !== "ELIGIBLE" || input.candidate.qualityEligibility !== "ELIGIBLE" || input.candidate.normalizationEligibility !== "ELIGIBLE") throw new Error("CANDIDATE_NOT_ELIGIBLE")
    const registration = this.registrations.get(`${input.candidate.datasetId}:${input.candidate.kind}:${input.normalizationVersion}`)
    if (!registration) throw new Error("NORMALIZER_NOT_REGISTERED")
    return registration(input)
  }
}
