-- D2 Phase 1 blueprint only. Unapplied. Values use exact numeric storage, never float.
CREATE TABLE canonical.ohlcv (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id), provider_id text NOT NULL, venue text NOT NULL, symbol text NOT NULL, resolution text NOT NULL,
  open_time timestamptz NOT NULL, close_time timestamptz NOT NULL, open numeric NOT NULL, high numeric NOT NULL, low numeric NOT NULL, close numeric NOT NULL, volume numeric NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (venue, symbol, resolution, open_time, record_version),
  CHECK (close_time > open_time), CHECK (high >= low), CHECK (high >= open AND high >= close), CHECK (low <= open AND low <= close), CHECK (volume >= 0)
);
CREATE INDEX idx_ohlcv_bounded_read ON canonical.ohlcv (symbol, resolution, open_time DESC);

CREATE TABLE canonical.funding (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id), provider_id text NOT NULL, venue text NOT NULL, symbol text NOT NULL, funding_time timestamptz NOT NULL, funding_rate numeric NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id), schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64),
  observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (venue, symbol, funding_time, record_version)
);
CREATE INDEX idx_funding_bounded_read ON canonical.funding (symbol, funding_time DESC);

CREATE TABLE canonical.open_interest (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id), provider_id text NOT NULL, venue text NOT NULL, symbol text NOT NULL, observation_window text NOT NULL, open_interest numeric NOT NULL, unit text NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id), schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64),
  observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, venue, symbol, observation_window, observed_at, record_version), CHECK (open_interest >= 0)
);
CREATE INDEX idx_open_interest_bounded_read ON canonical.open_interest (symbol, observed_at DESC);

CREATE TABLE canonical.liquidations (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id), provider_id text NOT NULL, provider_record_id text NOT NULL, venue text NOT NULL, symbol text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY','SELL')), price numeric NOT NULL CHECK (price > 0), quantity numeric NOT NULL CHECK (quantity > 0), event_time timestamptz NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id), schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64),
  observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, venue, provider_record_id, record_version)
);
CREATE INDEX idx_liquidations_bounded_read ON canonical.liquidations (symbol, event_time DESC);

CREATE TABLE canonical.prediction_snapshots (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  provider_id text NOT NULL, market_id text NOT NULL, outcome_id text NOT NULL, subject text NOT NULL, probability numeric NOT NULL CHECK (probability >= 0 AND probability <= 1), volume numeric NULL CHECK (volume IS NULL OR volume >= 0), liquidity numeric NULL CHECK (liquidity IS NULL OR liquidity >= 0),
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, market_id, outcome_id, observed_at, record_version)
);
CREATE INDEX idx_prediction_snapshots_bounded_read ON canonical.prediction_snapshots (market_id, observed_at DESC);

CREATE TABLE canonical.etf_observations (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  provider_id text NOT NULL, instrument_id text NOT NULL, flow_value numeric NOT NULL, currency text NOT NULL, window_start timestamptz NOT NULL, window_end timestamptz NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, instrument_id, window_start, window_end, record_version), CHECK (window_end > window_start)
);
CREATE INDEX idx_etf_observations_bounded_read ON canonical.etf_observations (instrument_id, window_end DESC);

CREATE TABLE canonical.reserve_observations (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  provider_id text NOT NULL, venue text NOT NULL, asset text NOT NULL, balance numeric NOT NULL CHECK (balance >= 0), unit text NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, venue, asset, observed_at, record_version)
);
CREATE INDEX idx_reserve_observations_bounded_read ON canonical.reserve_observations (venue, asset, observed_at DESC);

CREATE TABLE canonical.macro_observations (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  provider_id text NOT NULL, series_id text NOT NULL, subject text NOT NULL, value numeric NOT NULL, unit text NOT NULL, period text NOT NULL, effective_at timestamptz NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, series_id, period, record_version)
);
CREATE INDEX idx_macro_observations_bounded_read ON canonical.macro_observations (series_id, observed_at DESC);

CREATE TABLE canonical.stream_manifests (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0), commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id),
  provider_id text NOT NULL, stream_kind text NOT NULL CHECK (stream_kind IN ('AGG_TRADE','ORDERBOOK')), venue text NOT NULL, symbol text NOT NULL, raw_object_id text NOT NULL REFERENCES raw.objects(object_id),
  window_start timestamptz NOT NULL, window_end timestamptz NOT NULL, first_sequence text NULL, last_sequence text NULL, record_count bigint NULL CHECK (record_count IS NULL OR record_count >= 0),
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, stream_kind, venue, symbol, window_start, window_end, record_version), CHECK (window_end > window_start)
);
CREATE INDEX idx_stream_manifests_bounded_read ON canonical.stream_manifests (stream_kind, symbol, window_start, window_end);
