import { canonicalChecksum, canonicalSerialize, normalizeIdentifier, normalizeIsoTimestamp } from "./canonicalSerialization"

export interface CanonicalIdentityInput {
  datasetId: string
  providerId?: string
  venue?: string
  market?: string
  instrument?: string
  symbol?: string
  resolution?: string
  eventTime?: string | number | Date
  observationTime?: string | number | Date
  providerRecordId?: string
  businessKey?: Readonly<Record<string, unknown>>
  revision?: string
  schemaVersion: string
}

export interface DatasetIdentityRule { ruleId: string; requiredFields: readonly (keyof CanonicalIdentityInput)[]; includeProviderIdentity: boolean }

export interface CanonicalIdentity {
  businessIdentity: string
  providerIdentity: string | null
  canonicalRecordIdentity: string
  lineageIdentity: string
}

function normalizedIdentityInput(input: CanonicalIdentityInput, rule: DatasetIdentityRule): Record<string, unknown> {
  for (const field of rule.requiredFields) if (input[field] === undefined || input[field] === "") throw new TypeError(`Missing identity field: ${field}`)
  const output: Record<string, unknown> = { datasetId: input.datasetId, schemaVersion: input.schemaVersion }
  for (const field of rule.requiredFields) {
    let value = input[field]
    if ((field === "eventTime" || field === "observationTime") && value !== undefined) value = normalizeIsoTimestamp(value as string | number | Date)
    if (["venue", "market", "instrument", "symbol", "resolution"].includes(field) && typeof value === "string") value = normalizeIdentifier(value)
    output[field] = value
  }
  return output
}

export function generateCanonicalIdentity(input: CanonicalIdentityInput, rule: DatasetIdentityRule): CanonicalIdentity {
  const businessPayload = normalizedIdentityInput(input, rule)
  const businessIdentity = `biz_${canonicalChecksum(businessPayload)}`
  const providerIdentity = input.providerId ? `prv_${canonicalChecksum({ providerId: input.providerId, providerRecordId: input.providerRecordId ?? null })}` : null
  const canonicalRecordIdentity = `rec_${canonicalChecksum({ businessIdentity, providerIdentity: rule.includeProviderIdentity ? providerIdentity : null })}`
  return { businessIdentity, providerIdentity, canonicalRecordIdentity, lineageIdentity: `lin_${canonicalChecksum({ canonicalRecordIdentity, serialized: canonicalSerialize(businessPayload) })}` }
}
