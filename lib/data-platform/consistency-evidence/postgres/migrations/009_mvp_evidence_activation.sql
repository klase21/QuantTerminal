-- MVP-2: immutable structured market-state assessment attached to Core Evidence.
CREATE TABLE evidence.mvp_market_assessments (
  assessment_id text PRIMARY KEY,
  assessment_identity text NOT NULL UNIQUE CHECK (assessment_identity ~ '^[0-9a-f]{64}$'),
  assessment_checksum text NOT NULL CHECK (assessment_checksum ~ '^[0-9a-f]{64}$'),
  packet_version_id text NOT NULL UNIQUE REFERENCES evidence.core_packet_versions(packet_version_id),
  corpus_id text NOT NULL,
  corpus_checksum text NOT NULL CHECK (corpus_checksum ~ '^[0-9a-f]{64}$'),
  subject_id text NOT NULL,
  event_time_start timestamptz NOT NULL,
  event_time_end timestamptz NOT NULL,
  knowledge_time_cutoff timestamptz NOT NULL,
  market_state text NOT NULL CHECK (market_state IN ('POSITIONING_EXPANSION','FUNDING_PRESSURE','AGGRESSIVE_FLOW_DOMINANCE','DERIVATIVES_OVERHEATING','DELEVERAGING','MIXED','NEUTRAL','NOT_EVALUABLE')),
  structured_interpretation jsonb NOT NULL CHECK (jsonb_typeof(structured_interpretation) = 'object'),
  confidence_components jsonb NOT NULL CHECK (jsonb_typeof(confidence_components) = 'object'),
  confidence_classification text NOT NULL CHECK (confidence_classification IN ('HIGH','MEDIUM','LOW','NOT_AVAILABLE')),
  coverage_summary jsonb NOT NULL CHECK (jsonb_typeof(coverage_summary) = 'object'),
  source_lineage_summary jsonb NOT NULL CHECK (jsonb_typeof(source_lineage_summary) = 'object'),
  limitations text[] NOT NULL,
  rule_versions jsonb NOT NULL CHECK (jsonb_typeof(rule_versions) = 'array'),
  measurement_versions jsonb NOT NULL CHECK (jsonb_typeof(measurement_versions) = 'array'),
  recompute_identity text NOT NULL CHECK (recompute_identity ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  CHECK (event_time_end > event_time_start)
);
CREATE INDEX mvp_market_assessment_subject_time_idx ON evidence.mvp_market_assessments(subject_id,event_time_end DESC,assessment_id);
CREATE INDEX mvp_market_assessment_state_idx ON evidence.mvp_market_assessments(market_state,event_time_end DESC,assessment_id);
CREATE TRIGGER mvp_market_assessments_no_mutation BEFORE UPDATE OR DELETE ON evidence.mvp_market_assessments FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();
REVOKE ALL ON evidence.mvp_market_assessments FROM PUBLIC;
GRANT SELECT,INSERT ON evidence.mvp_market_assessments TO qt_d4_evidence_assembler;
GRANT SELECT ON evidence.mvp_market_assessments TO qt_d4_read_only;
