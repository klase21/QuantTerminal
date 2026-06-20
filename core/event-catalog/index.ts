import { InMemoryVerifiedEventCatalog } from "./verifiedEventCatalog"
import { VERIFIED_EVENT_SEED_CATALOG } from "./verifiedEventSeed"

export const verifiedEventCatalogReader = new InMemoryVerifiedEventCatalog(VERIFIED_EVENT_SEED_CATALOG)

export { InMemoryVerifiedEventCatalog } from "./verifiedEventCatalog"
export { VERIFIED_EVENT_SEED_CATALOG } from "./verifiedEventSeed"
export {
  VERIFIED_EVENT_CATALOG_VERSION,
  VERIFIED_EVENT_CATEGORIES,
  VERIFIED_EVENT_SCHEMA_VERSION,
} from "./verifiedEventTypes"
export type {
  VerifiedEvent,
  VerifiedEventCatalog,
  VerifiedEventCatalogReader,
  VerifiedEventCategory,
  VerifiedEventDateRange,
  VerifiedEventEvidence,
  VerifiedEventEvidenceKind,
  VerifiedEventSource,
} from "./verifiedEventTypes"
