ALTER TABLE canonical.open_interest
  ADD COLUMN canonical_instrument_id text,
  ADD COLUMN market_type text,
  ADD COLUMN open_interest_value numeric,
  ADD COLUMN value_unit text;

ALTER TABLE canonical.open_interest
  ADD CONSTRAINT open_interest_value_nonnegative
    CHECK (open_interest_value IS NULL OR open_interest_value >= 0),
  ADD CONSTRAINT open_interest_market_type_bounded
    CHECK (market_type IS NULL OR market_type = 'USD_M_FUTURES'),
  ADD CONSTRAINT open_interest_value_unit_pair
    CHECK ((open_interest_value IS NULL) = (value_unit IS NULL)),
  ADD CONSTRAINT open_interest_value_unit_bounded
    CHECK (value_unit IS NULL OR value_unit = 'PROVIDER_NATIVE_QUOTE_VALUE'),
  ADD CONSTRAINT open_interest_phase3_metadata_required
    CHECK (
      normalization_version <> 'd3-phase3-normalizer-v1'
      OR (
        canonical_instrument_id IS NOT NULL
        AND market_type IS NOT NULL
        AND observation_window = '5m'
        AND unit = 'PROVIDER_NATIVE'
      )
    );

CREATE INDEX idx_open_interest_canonical_instrument_time
  ON canonical.open_interest (canonical_instrument_id, observed_at DESC)
  WHERE canonical_instrument_id IS NOT NULL;
