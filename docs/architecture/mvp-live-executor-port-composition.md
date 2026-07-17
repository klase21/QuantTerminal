# MVP Live Executor Port Composition

## Scope

The live executor port layer converts bounded dataset and downstream services into the coordinator's exact 24-outcome graph. It accepts one certified UTC day, one checksummed planner contract, one run-independent logical slot, a fenced unit, explicit allowlists, and explicit upstream identities. It never discovers work through a historical scan and exposes no activation operation.

## Shared Slot Pipeline

Each dataset adapter implements the same ordered boundary:

1. source finalization and bounded retrieval
2. checksummed Raw Artifact persistence
3. deterministic Candidate normalization and persistence
4. immutable canonical or Segment commit
5. attribution and validation

Dataset-specific parsers, validation rules, and persistence remain behind the adapter. The composition layer accepts only `CREATED` or exact `DUPLICATE` as successful canonical outcomes. Conflict, missing attribution, source non-finalization, and incomplete prerequisites fail closed.

OHLCV rejects BTCUSDT acquisition because that logical slot is satisfied exclusively by the authoritative recovery output. Open Interest and Funding preserve provider-native observations. AggTrades retains the Segment boundary and does not expose a full-history scan or broad worker fallback.

## Watermarks And Downstream

Dataset completeness is derived from six unique logical instruments, never physical unit counts. A dataset watermark requires six validated attributable outputs. The common watermark requires all four dataset watermark identities. Append-only watermark persistence is supplied through a dedicated audit port.

Coverage, Consistency, Evidence, Projections, Replay, candidate assembly, manifest persistence, and comparison receive explicit upstream identities and checksums from prior coordinator checkpoints. Candidate assembly remains `WITHHELD` and `INTERNAL_ONLY` and has no activation method.

## Certification

Fixture certification executed the composed 1+23 graph through all 17 coordinator stages. It observed 23 dataset calls, zero BTCUSDT OHLCV acquisition calls, five bounded downstream calls, deterministic exact rerun, and no exposure. Dataset, Retrieval, Raw Artifact, Candidate, canonical commit, watermark, downstream, candidate, manifest, and comparison failures remain fail closed.

The process-environment bootstrap now instantiates the concrete dataset, persistence, downstream, Replay, and inactive candidate adapters and owns their disposal. The worker no longer injects ports and no bootstrap-required sentinel remains. Live execution is still blocked by the current local authentication and serving-role diagnostics; fixture ports are never substituted for live execution.
