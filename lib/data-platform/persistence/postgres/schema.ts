export const D2_POSTGRES_SCHEMAS = Object.freeze(["control", "raw", "canonical", "repository", "quality", "coverage", "projection", "evidence", "consistency", "quarantine"] as const)
export const D2_MIGRATION_ORDER = Object.freeze([
  "001_control_and_raw.sql",
  "002_repository_lifecycle.sql",
  "003_canonical_fact_tables.sql",
  "004_governance_and_read_models.sql",
  "005_funding_event_metadata.sql",
  "006_open_interest_observation_metadata.sql",
] as const)
export const D2_SCHEMA_BLUEPRINT_VERSION = "d2-phase1-v1" as const
