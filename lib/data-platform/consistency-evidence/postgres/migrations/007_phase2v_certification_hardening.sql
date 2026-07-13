-- D4 Phase 2V: fenced recompute leases and bounded runtime roles.
CREATE TABLE consistency.recompute_step_lease_state (
  step_id text PRIMARY KEY REFERENCES consistency.recompute_plan_steps(step_id),
  worker_id text NOT NULL,
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  lease_state text NOT NULL CHECK (lease_state IN ('ACTIVE','RELEASED','COMPLETED')),
  expires_at timestamptz NOT NULL,
  state_checksum text NOT NULL CHECK (state_checksum ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz NOT NULL
);

CREATE TABLE consistency.recompute_step_lease_events (
  event_id text PRIMARY KEY,
  step_id text NOT NULL REFERENCES consistency.recompute_plan_steps(step_id),
  worker_id text NOT NULL,
  fencing_token bigint NOT NULL CHECK (fencing_token > 0),
  event_type text NOT NULL CHECK (event_type IN ('CLAIMED','HEARTBEAT','EXPIRED','RECLAIMED','RELEASED','COMPLETED')),
  occurred_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  event_checksum text NOT NULL CHECK (event_checksum ~ '^[0-9a-f]{64}$'),
  UNIQUE(step_id,fencing_token,event_type,event_checksum)
);

CREATE INDEX recompute_step_active_lease_idx ON consistency.recompute_step_lease_state(lease_state,expires_at,step_id);
CREATE INDEX recompute_step_lease_history_idx ON consistency.recompute_step_lease_events(step_id,fencing_token,occurred_at,event_id);
CREATE INDEX consistency_result_temporal_lookup_idx ON consistency.immutable_results(knowledge_mode,knowledge_time_cutoff,event_time_start,event_time_end,rule_id,rule_version,result_id);

CREATE FUNCTION consistency.lease_digest(material text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
RETURN md5(material || ':d4-phase2v-a') || md5(material || ':d4-phase2v-b');

CREATE FUNCTION consistency.claim_recompute_step(p_step_id text,p_worker_id text,p_claimed_at timestamptz,p_expires_at timestamptz)
RETURNS TABLE(claim_status text,fencing_token bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,consistency AS $$
DECLARE current_row consistency.recompute_step_lease_state%ROWTYPE; next_token bigint; material text; digest text;
BEGIN
  IF p_worker_id='' OR p_expires_at<=p_claimed_at THEN RAISE EXCEPTION 'INVALID_RECOMPUTE_LEASE' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_step_id));
  IF NOT EXISTS(SELECT 1 FROM consistency.recompute_plan_steps WHERE step_id=p_step_id) THEN RAISE EXCEPTION 'RECOMPUTE_STEP_MISSING' USING ERRCODE='23503'; END IF;
  SELECT * INTO current_row FROM consistency.recompute_step_lease_state WHERE step_id=p_step_id FOR UPDATE;
  IF NOT FOUND THEN
    next_token:=1; material:=concat_ws('|',p_step_id,p_worker_id,next_token,'CLAIMED',p_claimed_at,p_expires_at); digest:=consistency.lease_digest(material);
    INSERT INTO consistency.recompute_step_lease_state VALUES(p_step_id,p_worker_id,next_token,'ACTIVE',p_expires_at,digest,p_claimed_at);
    INSERT INTO consistency.recompute_step_lease_events VALUES('lease_evt_'||digest,p_step_id,p_worker_id,next_token,'CLAIMED',p_claimed_at,p_expires_at,digest);
    INSERT INTO consistency.recompute_step_claims VALUES(p_step_id,p_worker_id,p_claimed_at) ON CONFLICT DO NOTHING;
    RETURN QUERY SELECT 'CLAIMED'::text,next_token; RETURN;
  END IF;
  IF current_row.lease_state='COMPLETED' OR (current_row.lease_state='ACTIVE' AND current_row.expires_at>p_claimed_at) THEN RETURN QUERY SELECT 'DUPLICATE_CLAIM'::text,current_row.fencing_token; RETURN; END IF;
  IF current_row.lease_state='ACTIVE' THEN
    material:=concat_ws('|',p_step_id,current_row.worker_id,current_row.fencing_token,'EXPIRED',p_claimed_at,current_row.expires_at); digest:=consistency.lease_digest(material);
    INSERT INTO consistency.recompute_step_lease_events VALUES('lease_evt_'||digest,p_step_id,current_row.worker_id,current_row.fencing_token,'EXPIRED',p_claimed_at,current_row.expires_at,digest) ON CONFLICT DO NOTHING;
  END IF;
  next_token:=current_row.fencing_token+1; material:=concat_ws('|',p_step_id,p_worker_id,next_token,'RECLAIMED',p_claimed_at,p_expires_at); digest:=consistency.lease_digest(material);
  UPDATE consistency.recompute_step_lease_state SET worker_id=p_worker_id,fencing_token=next_token,lease_state='ACTIVE',expires_at=p_expires_at,state_checksum=digest,updated_at=p_claimed_at WHERE step_id=p_step_id;
  INSERT INTO consistency.recompute_step_lease_events VALUES('lease_evt_'||digest,p_step_id,p_worker_id,next_token,'RECLAIMED',p_claimed_at,p_expires_at,digest);
  RETURN QUERY SELECT 'CLAIMED'::text,next_token;
END $$;

CREATE FUNCTION consistency.heartbeat_recompute_step(p_step_id text,p_worker_id text,p_fencing_token bigint,p_occurred_at timestamptz,p_expires_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,consistency AS $$
DECLARE material text; digest text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_step_id));
  IF p_expires_at<=p_occurred_at OR NOT EXISTS(SELECT 1 FROM consistency.recompute_step_lease_state WHERE step_id=p_step_id AND worker_id=p_worker_id AND fencing_token=p_fencing_token AND lease_state='ACTIVE' AND expires_at>=p_occurred_at FOR UPDATE) THEN RETURN false; END IF;
  material:=concat_ws('|',p_step_id,p_worker_id,p_fencing_token,'HEARTBEAT',p_occurred_at,p_expires_at); digest:=consistency.lease_digest(material);
  UPDATE consistency.recompute_step_lease_state SET expires_at=p_expires_at,state_checksum=digest,updated_at=p_occurred_at WHERE step_id=p_step_id;
  INSERT INTO consistency.recompute_step_lease_events VALUES('lease_evt_'||digest,p_step_id,p_worker_id,p_fencing_token,'HEARTBEAT',p_occurred_at,p_expires_at,digest) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE FUNCTION consistency.assert_recompute_step_fence(p_step_id text,p_worker_id text,p_fencing_token bigint,p_at timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,consistency
RETURN EXISTS(SELECT 1 FROM consistency.recompute_step_lease_state WHERE step_id=p_step_id AND worker_id=p_worker_id AND fencing_token=p_fencing_token AND lease_state='ACTIVE' AND expires_at>=p_at);

CREATE FUNCTION consistency.close_recompute_step_lease(p_step_id text,p_worker_id text,p_fencing_token bigint,p_event_type text,p_occurred_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,consistency AS $$
DECLARE current_row consistency.recompute_step_lease_state%ROWTYPE; material text; digest text; next_state text;
BEGIN
  IF p_event_type NOT IN ('RELEASED','COMPLETED') THEN RAISE EXCEPTION 'INVALID_LEASE_TERMINAL_EVENT' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_step_id));
  SELECT * INTO current_row FROM consistency.recompute_step_lease_state WHERE step_id=p_step_id FOR UPDATE;
  IF NOT FOUND OR current_row.worker_id<>p_worker_id OR current_row.fencing_token<>p_fencing_token OR current_row.lease_state<>'ACTIVE' OR current_row.expires_at<p_occurred_at THEN RETURN false; END IF;
  next_state:=p_event_type; material:=concat_ws('|',p_step_id,p_worker_id,p_fencing_token,p_event_type,p_occurred_at,current_row.expires_at); digest:=consistency.lease_digest(material);
  UPDATE consistency.recompute_step_lease_state SET lease_state=next_state,state_checksum=digest,updated_at=p_occurred_at WHERE step_id=p_step_id;
  INSERT INTO consistency.recompute_step_lease_events VALUES('lease_evt_'||digest,p_step_id,p_worker_id,p_fencing_token,p_event_type,p_occurred_at,current_row.expires_at,digest) ON CONFLICT DO NOTHING;
  RETURN true;
END $$;

CREATE TRIGGER recompute_step_lease_events_no_mutation BEFORE UPDATE OR DELETE ON consistency.recompute_step_lease_events FOR EACH ROW EXECUTE FUNCTION consistency.reject_immutable_result_mutation();

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qt_d4_consistency_worker') THEN CREATE ROLE qt_d4_consistency_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='qt_d4_read_only') THEN CREATE ROLE qt_d4_read_only NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT; END IF;
END $$;
GRANT qt_d4_consistency_worker,qt_d4_read_only TO CURRENT_USER;

REVOKE ALL ON SCHEMA consistency,d4_control FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA consistency,d4_control FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA consistency FROM PUBLIC;
REVOKE ALL ON d4_control.migration_ledger FROM qt_d4_consistency_worker,qt_d4_read_only;
GRANT USAGE ON SCHEMA consistency,control,repository TO qt_d4_consistency_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA consistency TO qt_d4_consistency_worker;
REVOKE UPDATE,DELETE,TRUNCATE ON ALL TABLES IN SCHEMA consistency FROM qt_d4_consistency_worker;
GRANT INSERT ON consistency.run_specifications,consistency.run_states,consistency.run_events,consistency.run_completion_summaries,consistency.run_creation_conflicts,
  consistency.immutable_results,consistency.result_run_links,consistency.result_input_references,consistency.result_temporal_references,consistency.immutable_result_diagnostics,consistency.result_conflicts,
  consistency.dependency_nodes,consistency.dependency_edges,consistency.dependency_edge_conflicts,consistency.dependency_snapshots,consistency.dependency_snapshot_nodes,consistency.dependency_snapshot_edges,
  consistency.recompute_requests_v2,consistency.recompute_conflicts,consistency.recompute_plans,consistency.recompute_plan_steps,consistency.recompute_step_events,
  consistency.result_dependency_links,consistency.result_selection_decisions TO qt_d4_consistency_worker;
GRANT UPDATE ON consistency.run_states TO qt_d4_consistency_worker;
GRANT SELECT ON control.policy_versions TO qt_d4_consistency_worker;
GRANT EXECUTE ON FUNCTION consistency.claim_recompute_step(text,text,timestamptz,timestamptz),consistency.heartbeat_recompute_step(text,text,bigint,timestamptz,timestamptz),consistency.assert_recompute_step_fence(text,text,bigint,timestamptz),consistency.close_recompute_step_lease(text,text,bigint,text,timestamptz) TO qt_d4_consistency_worker;
GRANT USAGE ON SCHEMA consistency,d4_control TO qt_d4_read_only;
GRANT SELECT ON ALL TABLES IN SCHEMA consistency TO qt_d4_read_only;
GRANT SELECT ON d4_control.migration_ledger TO qt_d4_read_only;
