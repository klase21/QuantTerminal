ALTER TABLE repository.envelopes
  DROP CONSTRAINT envelopes_fact_table_check,
  ADD CONSTRAINT envelopes_fact_table_check
    CHECK (fact_table IN ('OHLCV','FUNDING','OPEN_INTEREST','AGG_TRADE','LIQUIDATION','PREDICTION_SNAPSHOT','ETF_OBSERVATION','RESERVE_OBSERVATION','MACRO_OBSERVATION','STREAM_MANIFEST'));

CREATE TABLE canonical.agg_trades (
  fact_id text PRIMARY KEY, canonical_record_id text NOT NULL, business_identity text NOT NULL, record_version integer NOT NULL CHECK (record_version > 0),
  commit_id text NOT NULL UNIQUE REFERENCES control.canonical_commits(commit_id), provider_id text NOT NULL, venue text NOT NULL, symbol text NOT NULL,
  canonical_instrument_id text NOT NULL, market_type text NOT NULL CHECK (market_type = 'USD_M_FUTURES'), aggregate_trade_id text NOT NULL,
  price numeric NOT NULL CHECK (price > 0), quantity numeric NOT NULL CHECK (quantity > 0), first_trade_id text NOT NULL, last_trade_id text NOT NULL,
  trade_time timestamptz NOT NULL, source_timestamp text NOT NULL, buyer_is_maker boolean NOT NULL,
  registry_snapshot_id text NOT NULL REFERENCES control.registry_snapshots(snapshot_id), provider_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id),
  provider_certification_snapshot_id text NOT NULL REFERENCES control.provider_snapshots(snapshot_id), policy_version_id text NOT NULL REFERENCES control.policy_versions(policy_version_id),
  schema_version text NOT NULL, normalization_version text NOT NULL, checksum text NOT NULL CHECK (length(checksum) = 64), observed_at timestamptz NOT NULL, recorded_at timestamptz NOT NULL, created_at timestamptz NOT NULL,
  CHECK (aggregate_trade_id ~ '^[0-9]+$'), CHECK (first_trade_id ~ '^[0-9]+$'), CHECK (last_trade_id ~ '^[0-9]+$'), CHECK (source_timestamp ~ '^[0-9]+$'),
  CHECK (first_trade_id::numeric <= last_trade_id::numeric), CHECK (trade_time = observed_at),
  UNIQUE (canonical_record_id, record_version), UNIQUE (provider_id, venue, symbol, aggregate_trade_id, record_version)
);
CREATE INDEX idx_agg_trades_bounded_read ON canonical.agg_trades (canonical_instrument_id, trade_time DESC, aggregate_trade_id DESC);
