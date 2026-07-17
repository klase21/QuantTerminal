# Integrated MVP Governance Prerequisites

## Boundary

Live bounded refresh writes use the integrated durable D2 target. Before any refresh execution setup or payload persistence, the worker verifies the exact immutable dataset registry, provider registry, provider certification, and policy identities required by OHLCV, Open Interest, bounded provider-native Funding, and AggTrades.

The definitions come from committed adapters and normalizers. Missing approved definitions may be added only by the explicit `bootstrap-governance` operator command through the public canonical persistence adapter. Existing identities with a different checksum or provider/dataset binding fail closed. The service never copies rows from an isolated certification database and never updates existing governance rows.

## Funding Incident

The failed live attempt referenced the legacy broad Funding provider snapshot identity, which was absent from integrated D2. The live executor now uses the committed bounded Funding identities instead: provider-native REST provider, bounded certification, and bounded policy. The bounded policy uses the committed source-contract version so it does not collide with the legacy Funding policy's `(dataset, policy_version)` uniqueness.

Bootstrap created the three missing bounded Funding definitions. Exact reapplication returned `DUPLICATE`; all sixteen live governance prerequisites are now checksum-valid.

## Ordering

Preflight order is target and role verification, schema availability, governance inventory, object-storage capability, source availability, authoritative recovery, planner verification, and rollback-only executor/downstream/candidate capability. Missing or conflicting governance stops before plan, run, unit, lease, payload, or candidate creation.

Raw archive transport identity remains distinct from canonical provider identity where the certified source contract requires it. In particular, Binance Vision Open Interest archive bytes retain the immutable archive transport manifest while Candidates and canonical Facts use the certified `binance-vision` provider binding.
