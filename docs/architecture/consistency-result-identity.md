# Consistency Result Identity

## Boundary

A Consistency Result is an immutable semantic evaluation record. It is distinct from the Canonical Facts it references, the temporal alignment that selected them, the Run that requested evaluation, and any future Evidence or Projection.

## Identity Material

Result identity includes:

- Rule ID and semantic version;
- RuleSet ID and version;
- exact canonical record IDs and positive record versions;
- assigned input roles and deterministic input-set identity;
- Run-independent semantic temporal-alignment identity;
- Event-Time window;
- Knowledge-Time mode and cutoff;
- temporal, comparison, and severity policy versions;
- diagnostic schema version;
- Result schema version.

Inputs are canonically serialized and sorted by semantic content. Insertion order cannot affect identity.

Result identity excludes Run ID, attempt/worker/process/database identities, creation and evaluation timestamps, execution duration, diagnostic prose, and provider tier.

## Temporal Reference

The Result core uses a Run-independent semantic temporal reference derived from the complete structured alignment selection, rejection, policy, no-lookahead, and diagnostic content. Each append-only Run link separately retains the exact source alignment ID and checksum produced for that Run. This preserves audit traceability without leaking Run identity into semantic Result identity.

## Corrections

A corrected Fact version changes the exact input reference and therefore creates a distinct Result identity. Existing V1 Results remain immutable and queryable. Phase 2B does not select a current preferred Result and does not implement dependency impact or recompute scheduling.

## Checksum

The Result checksum covers all immutable core truth fields, including outcome, severity, blocking state, exact inputs, semantic temporal reference, structured diagnostics, time bounds, and policy bindings. It excludes creation time and append-only Run associations. Equivalent reordered inputs and bounded diagnostic values produce the same checksum; truth changes produce a different checksum.
