-- D2 Phase 2 role blueprint. Apply only in an explicitly isolated environment as migration owner.
-- Concrete passwords and LOGIN attributes are intentionally absent.
CREATE ROLE qt_d2_canonical_writer NOLOGIN;
CREATE ROLE qt_d2_bounded_writer NOLOGIN;
CREATE ROLE qt_d2_read_only NOLOGIN;

GRANT USAGE ON SCHEMA canonical, repository, raw, control, quality, coverage, projection, evidence, consistency, quarantine TO qt_d2_read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA canonical, repository, raw, control, quality, coverage, projection, evidence, consistency, quarantine TO qt_d2_read_only;

GRANT USAGE ON SCHEMA canonical, repository, raw, control, quarantine TO qt_d2_canonical_writer;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA canonical, raw, quarantine TO qt_d2_canonical_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA repository TO qt_d2_canonical_writer;
GRANT INSERT ON repository.envelopes, repository.record_versions, repository.supersessions, repository.lineage_edges TO qt_d2_canonical_writer;
GRANT SELECT, INSERT ON control.canonical_commits, control.outbox TO qt_d2_canonical_writer;
GRANT SELECT ON control.registry_snapshots, control.provider_snapshots, control.policy_versions TO qt_d2_canonical_writer;
GRANT EXECUTE ON FUNCTION repository.append_publication_decision(text,text,text,integer,repository.publication_state,text,timestamptz,text[],text,text) TO qt_d2_canonical_writer;
GRANT EXECUTE ON FUNCTION repository.append_initial_publication_decision(text,text,text,integer,text,timestamptz,text[]) TO qt_d2_canonical_writer;

GRANT USAGE ON SCHEMA repository TO qt_d2_bounded_writer;
GRANT EXECUTE ON FUNCTION repository.append_publication_decision(text,text,text,integer,repository.publication_state,text,timestamptz,text[],text,text) TO qt_d2_bounded_writer;

REVOKE INSERT, UPDATE, DELETE ON control.migration_ledger FROM qt_d2_canonical_writer, qt_d2_bounded_writer, qt_d2_read_only;
REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA canonical, repository, raw, quality, coverage, projection, evidence, consistency, quarantine FROM qt_d2_canonical_writer, qt_d2_bounded_writer, qt_d2_read_only;
REVOKE CREATE ON SCHEMA public, canonical, repository, raw, control, quality, coverage, projection, evidence, consistency, quarantine FROM qt_d2_canonical_writer, qt_d2_bounded_writer, qt_d2_read_only;
