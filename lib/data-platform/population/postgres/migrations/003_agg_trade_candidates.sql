ALTER TABLE population.candidates
  DROP CONSTRAINT candidates_candidate_kind_check;

ALTER TABLE population.candidates
  ADD CONSTRAINT candidates_candidate_kind_check
  CHECK (candidate_kind IN ('OHLCV','FUNDING','OPEN_INTEREST','LIQUIDATION','STREAM_MANIFEST','AGG_TRADE'));
