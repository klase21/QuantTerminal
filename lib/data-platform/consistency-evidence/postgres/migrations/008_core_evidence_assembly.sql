-- D4 Phase 3A: immutable consumer-neutral Core Evidence Packets.
CREATE TABLE evidence.core_assembly_profiles (
  profile_id text NOT NULL, profile_version text NOT NULL, schema_version text NOT NULL,
  assembly_policy_id text NOT NULL, assembly_policy_version text NOT NULL,
  selection_policy_references jsonb NOT NULL CHECK(jsonb_typeof(selection_policy_references)='array'),
  conclusion_policy_id text NOT NULL, conclusion_policy_version text NOT NULL,
  role_rules jsonb NOT NULL CHECK(jsonb_typeof(role_rules)='array'), required_roles text[] NOT NULL, optional_roles text[] NOT NULL,
  definition_checksum text NOT NULL CHECK(definition_checksum~'^[0-9a-f]{64}$'), created_at timestamptz NOT NULL,
  PRIMARY KEY(profile_id,profile_version)
);
CREATE TABLE evidence.core_packet_identities (
  packet_id text PRIMARY KEY, evidence_business_identity text NOT NULL UNIQUE CHECK(evidence_business_identity~'^[0-9a-f]{64}$'),
  subject_id text NOT NULL, subject_type text NOT NULL, topic text NOT NULL, event_time_start timestamptz NOT NULL,event_time_end timestamptz NOT NULL,
  knowledge_mode text NOT NULL CHECK(knowledge_mode IN('AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE')),knowledge_time_cutoff timestamptz NOT NULL,
  profile_id text NOT NULL,profile_version text NOT NULL,schema_version text NOT NULL,created_at timestamptz NOT NULL,
  FOREIGN KEY(profile_id,profile_version) REFERENCES evidence.core_assembly_profiles(profile_id,profile_version),CHECK(event_time_end>event_time_start)
);
CREATE TABLE evidence.core_candidates (
  candidate_id text PRIMARY KEY,candidate_identity text NOT NULL UNIQUE CHECK(candidate_identity~'^[0-9a-f]{64}$'),candidate_checksum text NOT NULL CHECK(candidate_checksum~'^[0-9a-f]{64}$'),
  subject_id text NOT NULL,subject_type text NOT NULL,topic text NOT NULL,role text NOT NULL CHECK(role IN('SUPPORTING','CONFLICTING','CONTEXTUAL','BLOCKING')),
  candidate_status text NOT NULL CHECK(candidate_status IN('ELIGIBLE','BLOCKED','INSUFFICIENT','NOT_APPLICABLE')),
  result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),result_identity text NOT NULL CHECK(result_identity~'^[0-9a-f]{64}$'),result_checksum text NOT NULL CHECK(result_checksum~'^[0-9a-f]{64}$'),
  rule_id text NOT NULL,rule_version text NOT NULL,rule_set_id text NOT NULL,rule_set_version text NOT NULL,result_outcome text NOT NULL,result_severity text NOT NULL,
  event_time_start timestamptz NOT NULL,event_time_end timestamptz NOT NULL,knowledge_mode text NOT NULL CHECK(knowledge_mode IN('AS_KNOWN_THEN','LATEST_CORRECTED','RETROSPECTIVE')),knowledge_time_cutoff timestamptz NOT NULL,
  dependency_snapshot_id text,policy_references jsonb NOT NULL CHECK(jsonb_typeof(policy_references)='array'),diagnostic_codes text[] NOT NULL,created_at timestamptz NOT NULL
);
CREATE TABLE evidence.core_packet_versions (
  packet_version_id text PRIMARY KEY,packet_version_identity text NOT NULL UNIQUE CHECK(packet_version_identity~'^[0-9a-f]{64}$'),packet_id text NOT NULL REFERENCES evidence.core_packet_identities(packet_id),
  packet_checksum text NOT NULL CHECK(packet_checksum~'^[0-9a-f]{64}$'),conclusion_code text NOT NULL CHECK(conclusion_code IN('EVIDENCE_SUPPORTS','EVIDENCE_CONFLICTS','EVIDENCE_MIXED','EVIDENCE_INSUFFICIENT','EVIDENCE_BLOCKED','NOT_APPLICABLE')),
  packet_status text NOT NULL CHECK(packet_status IN('ELIGIBLE','BLOCKED','INSUFFICIENT','NOT_APPLICABLE')),uncertainty_reason_codes text[] NOT NULL,created_at timestamptz NOT NULL
);
CREATE TABLE evidence.core_packet_candidates(packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),candidate_id text NOT NULL REFERENCES evidence.core_candidates(candidate_id),evidence_role text NOT NULL CHECK(evidence_role IN('SUPPORTING','CONFLICTING','CONTEXTUAL','BLOCKING')),PRIMARY KEY(packet_version_id,candidate_id));
CREATE TABLE evidence.core_packet_result_references(packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),candidate_id text NOT NULL REFERENCES evidence.core_candidates(candidate_id),result_id text NOT NULL REFERENCES consistency.immutable_results(result_id),result_identity text NOT NULL CHECK(result_identity~'^[0-9a-f]{64}$'),reference_checksum text NOT NULL CHECK(reference_checksum~'^[0-9a-f]{64}$'),PRIMARY KEY(packet_version_id,candidate_id,result_id));
CREATE TABLE evidence.core_packet_fact_references(packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),candidate_id text NOT NULL REFERENCES evidence.core_candidates(candidate_id),role_id text NOT NULL,canonical_record_id text NOT NULL,record_version integer NOT NULL CHECK(record_version>0),dataset_id text NOT NULL,provider_id text NOT NULL,provider_snapshot_id text NOT NULL,effective_at timestamptz,observed_at timestamptz NOT NULL,knowledge_available_at timestamptz NOT NULL,publication_state repository.publication_state NOT NULL,supersession_state text NOT NULL,input_checksum text NOT NULL CHECK(input_checksum~'^[0-9a-f]{64}$'),lineage_node_id text NOT NULL,PRIMARY KEY(packet_version_id,candidate_id,role_id,canonical_record_id,record_version));
CREATE TABLE evidence.core_packet_requirements(packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),requirement_id text NOT NULL,requirement_kind text NOT NULL CHECK(requirement_kind IN('MISSING','UNSUPPORTED','INAPPLICABLE','BLOCKED')),dataset_id text,reason_code text NOT NULL,policy_id text NOT NULL,policy_version text NOT NULL,PRIMARY KEY(packet_version_id,requirement_id));
CREATE TABLE evidence.core_packet_lineage(lineage_id text PRIMARY KEY,packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),lineage_type text NOT NULL CHECK(lineage_type IN('PACKET_TO_CANDIDATE','CANDIDATE_TO_RESULT','RESULT_TO_FACT','PACKET_TO_PROFILE','PACKET_REPLACES_PACKET')),from_id text NOT NULL,to_id text NOT NULL,lineage_checksum text NOT NULL CHECK(lineage_checksum~'^[0-9a-f]{64}$'),UNIQUE(packet_version_id,lineage_type,from_id,to_id));
CREATE TABLE evidence.core_packet_conflicts(conflict_id text PRIMARY KEY,packet_version_identity text NOT NULL CHECK(packet_version_identity~'^[0-9a-f]{64}$'),existing_packet_version_id text NOT NULL REFERENCES evidence.core_packet_versions(packet_version_id),existing_checksum text NOT NULL CHECK(existing_checksum~'^[0-9a-f]{64}$'),incoming_checksum text NOT NULL CHECK(incoming_checksum~'^[0-9a-f]{64}$'),detected_at timestamptz NOT NULL,reason_code text NOT NULL CHECK(reason_code='IMMUTABLE_PACKET_CONTENT_MISMATCH'),CHECK(existing_checksum<>incoming_checksum),UNIQUE(packet_version_identity,existing_checksum,incoming_checksum));
CREATE INDEX core_candidate_result_lookup_idx ON evidence.core_candidates(result_id,candidate_id);
CREATE INDEX core_packet_history_lookup_idx ON evidence.core_packet_identities(subject_id,topic,knowledge_mode,knowledge_time_cutoff,packet_id);
CREATE INDEX core_packet_fact_lookup_idx ON evidence.core_packet_fact_references(canonical_record_id,record_version,packet_version_id);
CREATE INDEX core_packet_conflict_lookup_idx ON evidence.core_packet_conflicts(packet_version_identity,detected_at,conflict_id);
CREATE TRIGGER core_profiles_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_assembly_profiles FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_identities_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_identities FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_candidates_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_candidates FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_versions_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_versions FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_candidates_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_candidates FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_result_refs_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_result_references FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_fact_refs_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_fact_references FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_requirements_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_requirements FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_lineage_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_lineage FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
CREATE TRIGGER core_packet_conflicts_no_mutation BEFORE UPDATE OR DELETE ON evidence.core_packet_conflicts FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qt_d4_evidence_assembler') THEN CREATE ROLE qt_d4_evidence_assembler NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;END IF;END $$;
GRANT qt_d4_evidence_assembler TO CURRENT_USER;
REVOKE ALL ON SCHEMA evidence FROM PUBLIC;REVOKE ALL ON ALL TABLES IN SCHEMA evidence FROM PUBLIC;
GRANT USAGE ON SCHEMA evidence,consistency TO qt_d4_evidence_assembler;
GRANT SELECT ON consistency.immutable_results,consistency.result_input_references,consistency.immutable_result_diagnostics,consistency.dependency_snapshots TO qt_d4_evidence_assembler;
GRANT SELECT ON evidence.core_assembly_profiles,evidence.core_packet_identities,evidence.core_candidates,evidence.core_packet_versions,evidence.core_packet_candidates,evidence.core_packet_result_references,evidence.core_packet_fact_references,evidence.core_packet_requirements,evidence.core_packet_lineage,evidence.core_packet_conflicts TO qt_d4_evidence_assembler;
GRANT INSERT ON evidence.core_candidates,evidence.core_packet_identities,evidence.core_packet_versions,evidence.core_packet_candidates,evidence.core_packet_result_references,evidence.core_packet_fact_references,evidence.core_packet_requirements,evidence.core_packet_lineage,evidence.core_packet_conflicts TO qt_d4_evidence_assembler;
GRANT USAGE ON SCHEMA evidence TO qt_d4_read_only;
GRANT SELECT ON evidence.core_assembly_profiles,evidence.core_packet_identities,evidence.core_candidates,evidence.core_packet_versions,evidence.core_packet_candidates,evidence.core_packet_result_references,evidence.core_packet_fact_references,evidence.core_packet_requirements,evidence.core_packet_lineage,evidence.core_packet_conflicts TO qt_d4_read_only;
