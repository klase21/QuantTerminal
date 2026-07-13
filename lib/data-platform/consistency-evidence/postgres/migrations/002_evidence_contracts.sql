-- Unapplied D4 V1 Phase 1 blueprint.
CREATE TABLE evidence.profiles (
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  assembly_policy_version_id text NOT NULL,
  publication_policy_version_id text NOT NULL,
  schema_version text NOT NULL,
  state text NOT NULL CHECK (state IN ('PROPOSED','APPROVED','SUSPENDED')),
  definition_checksum text NOT NULL CHECK (definition_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (profile_id, profile_version)
);

CREATE TABLE evidence.candidates (
  candidate_id text PRIMARY KEY,
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  subject_id text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  knowledge_mode text NOT NULL CHECK (knowledge_mode IN ('AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE')),
  knowledge_cutoff timestamptz NOT NULL,
  scenario_or_hypothesis_id text,
  identity_policy_version_id text,
  assembly_policy_version_id text NOT NULL,
  schema_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('CANDIDATE','ELIGIBLE','BLOCKED','INVALIDATED')),
  content_checksum text NOT NULL CHECK (content_checksum ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (window_end > window_start),
  FOREIGN KEY (profile_id, profile_version) REFERENCES evidence.profiles(profile_id, profile_version)
);

CREATE TABLE evidence.packet_identities (
  packet_id text PRIMARY KEY,
  evidence_business_identity text NOT NULL UNIQUE CHECK (evidence_business_identity ~ '^[0-9a-f]{64}$'),
  profile_id text NOT NULL,
  profile_version text NOT NULL,
  subject_id text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  knowledge_mode text NOT NULL CHECK (knowledge_mode IN ('AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE')),
  scenario_or_hypothesis_id text,
  identity_policy_version_id text,
  created_at timestamptz NOT NULL,
  FOREIGN KEY (profile_id, profile_version) REFERENCES evidence.profiles(profile_id, profile_version)
);

CREATE TABLE evidence.packet_versions (
  physical_packet_id text PRIMARY KEY,
  packet_id text NOT NULL REFERENCES evidence.packet_identities(packet_id),
  packet_version integer NOT NULL CHECK (packet_version > 0),
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  content_checksum text NOT NULL CHECK (content_checksum ~ '^[0-9a-f]{64}$'),
  current_publication_state repository.publication_state NOT NULL,
  status text NOT NULL CHECK (status IN ('ELIGIBLE','BLOCKED','INVALIDATED')),
  lineage_root_id text NOT NULL,
  assembly_policy_version_id text NOT NULL,
  schema_version text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (packet_id, packet_version)
);

CREATE TABLE evidence.fact_references (
  reference_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  physical_packet_id text REFERENCES evidence.packet_versions(physical_packet_id),
  evidence_role text NOT NULL CHECK (evidence_role IN ('SUPPORTING','CONFLICTING')),
  reference_ordinal integer NOT NULL CHECK (reference_ordinal >= 0),
  canonical_record_id text NOT NULL,
  record_version integer NOT NULL CHECK (record_version > 0),
  physical_fact_id text NOT NULL,
  dataset_id text NOT NULL,
  provider_id text NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  effective_at timestamptz,
  observed_at timestamptz NOT NULL,
  knowledge_available_at timestamptz NOT NULL,
  publication_state repository.publication_state NOT NULL,
  lineage_node_id text NOT NULL,
  dataset_registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id),
  provider_registry_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL,
  normalization_version text NOT NULL,
  UNIQUE (candidate_id, reference_ordinal),
  UNIQUE (candidate_id, evidence_role, canonical_record_id, record_version),
  FOREIGN KEY (canonical_record_id, record_version) REFERENCES repository.record_versions(canonical_record_id, record_version)
);

CREATE TABLE evidence.consistency_references (
  reference_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  physical_packet_id text REFERENCES evidence.packet_versions(physical_packet_id),
  result_id text NOT NULL REFERENCES consistency.rule_results(result_id),
  evidence_role text NOT NULL CHECK (evidence_role IN ('SUPPORTING','CONFLICTING')),
  UNIQUE (candidate_id, result_id, evidence_role)
);

CREATE TABLE evidence.requirements (
  requirement_record_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  physical_packet_id text REFERENCES evidence.packet_versions(physical_packet_id),
  requirement_id text NOT NULL,
  requirement_status text NOT NULL CHECK (requirement_status IN ('MISSING','UNSUPPORTED','INAPPLICABLE')),
  dataset_id text,
  reason_code text NOT NULL,
  policy_version_id text NOT NULL,
  UNIQUE (candidate_id, requirement_id)
);

CREATE TABLE evidence.confidence_components (
  component_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  physical_packet_id text REFERENCES evidence.packet_versions(physical_packet_id),
  component_kind text NOT NULL CHECK (component_kind IN ('AVAILABILITY','COVERAGE','FRESHNESS','QUALITY','CONSISTENCY','PROVIDER_DIVERSITY','CONFLICT_BURDEN','POLICY_COMPLETENESS','MODEL_CERTAINTY')),
  component_state text NOT NULL CHECK (component_state IN ('AVAILABLE','PARTIAL','MISSING','UNAVAILABLE','NOT_APPLICABLE')),
  policy_version_id text NOT NULL,
  governed_value text,
  unit text,
  UNIQUE (candidate_id, component_kind)
);

CREATE TABLE evidence.explanation_codes (
  explanation_record_id text PRIMARY KEY,
  candidate_id text NOT NULL REFERENCES evidence.candidates(candidate_id),
  physical_packet_id text REFERENCES evidence.packet_versions(physical_packet_id),
  code text NOT NULL,
  code_version text NOT NULL,
  driver_code text,
  UNIQUE (candidate_id, code, code_version)
);

CREATE TABLE evidence.packet_supersessions (
  supersession_id text PRIMARY KEY,
  packet_id text NOT NULL REFERENCES evidence.packet_identities(packet_id),
  predecessor_version integer NOT NULL CHECK (predecessor_version > 0),
  successor_version integer NOT NULL CHECK (successor_version > predecessor_version),
  created_at timestamptz NOT NULL,
  UNIQUE (packet_id, predecessor_version),
  UNIQUE (packet_id, successor_version)
);

CREATE TABLE evidence.invalidation_events (
  invalidation_id text PRIMARY KEY,
  packet_id text NOT NULL REFERENCES evidence.packet_identities(packet_id),
  packet_version integer NOT NULL CHECK (packet_version > 0),
  trigger_object_id text NOT NULL,
  trigger_object_version text NOT NULL,
  reason_code text NOT NULL,
  created_at timestamptz NOT NULL,
  UNIQUE (packet_id, packet_version, trigger_object_id, trigger_object_version, reason_code)
);

CREATE INDEX evidence_candidates_scope_idx ON evidence.candidates (profile_id, profile_version, subject_id, window_start, window_end, knowledge_mode);
CREATE INDEX evidence_packet_current_idx ON evidence.packet_versions (packet_id, packet_version DESC, current_publication_state);
CREATE INDEX evidence_fact_lookup_idx ON evidence.fact_references (canonical_record_id, record_version);
CREATE INDEX evidence_consistency_lookup_idx ON evidence.consistency_references (result_id);
