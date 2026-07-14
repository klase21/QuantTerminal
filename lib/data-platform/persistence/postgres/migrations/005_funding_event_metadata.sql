ALTER TABLE canonical.funding
  ADD COLUMN canonical_instrument_id text,
  ADD COLUMN market_type text,
  ADD COLUMN funding_interval_hours integer;

ALTER TABLE canonical.funding
  ADD CONSTRAINT funding_interval_hours_positive
    CHECK (funding_interval_hours IS NULL OR funding_interval_hours > 0),
  ADD CONSTRAINT funding_market_type_bounded
    CHECK (market_type IS NULL OR market_type = 'USD_M_FUTURES'),
  ADD CONSTRAINT funding_phase3_metadata_required
    CHECK (
      normalization_version <> 'd3-phase3-normalizer-v1'
      OR (
        canonical_instrument_id IS NOT NULL
        AND market_type IS NOT NULL
        AND funding_interval_hours IS NOT NULL
      )
    );

CREATE INDEX idx_funding_canonical_instrument_time
  ON canonical.funding (canonical_instrument_id, funding_time DESC)
  WHERE canonical_instrument_id IS NOT NULL;
