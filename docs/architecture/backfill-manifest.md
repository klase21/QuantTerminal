# Backfill Manifest

## Freeze Contract

An authoritative Backfill Manifest is immutable after approval and contains:

- manifest ID, schema version, approval state, checksum, and frozen UTC cutoff;
- exact provider and provider-certification snapshots;
- exact dataset registry snapshot and required/optional classification;
- complete canonical instrument identities and activation/deactivation ranges;
- verified source availability boundaries and source identities;
- deterministic partition dimensions and expected partition count;
- durable raw-storage destination and allowed prefix;
- D1 normalizer and policy versions;
- D2 commit target and canonical fact kind;
- retry, checksum, gap, and incremental-handoff policies.

Manifest identity changes when any scope, boundary, provider, instrument, cadence, cutoff, normalizer, target, or partition policy changes. Generated time is excluded. Jobs, Runs, and Units bind both manifest ID and checksum.

## Fail-Closed Draft State

`docs/project/d3-phase-3-backfill-manifest.blocked.json` is not an authoritative Manifest. Its `manifestId`, `manifestChecksum`, and `frozenCutoffUtc` are deliberately `null`. Assigning deterministic-looking values before scope approval would falsely freeze an incomplete product universe.

The blocked draft is preserved unchanged. The newer `docs/project/d3-phase-3-backfill-manifest.json` has a deterministic identity and a frozen cutoff, but remains `BLOCKED` and non-executable. It records classified scope and six bounded canary partitions without claiming that the full partition inventory is known.
