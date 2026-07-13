# D4 Consistency Contracts

The canonical contracts live under lib/data-platform/consistency.

Rule and RuleSet definitions are immutable and versioned. A Run binds one RuleSet, policy, bounded subject/time scope, knowledge cutoff, and ordered exact fact versions. Results are append-only and separate outcome from policy-owned advisory/blocking severity.

Closed Result outcomes are CONSISTENT, INCONSISTENT, PARTIAL, INDETERMINATE, NOT_APPLICABLE, and three blocked-input states. Phase 2 must not add outcomes without contract review.

Temporal alignment is policy-referenced. No-lookahead is explicit. Resampling, interpolation, aggregation, forward-fill, gaps, and tie breaking cannot be inferred by runtime code.

Run identity uses canonical serialization of RuleSet, normalized scope, exact input digest, and policy version. A changed record version or checksum changes work identity.

The initial registry contains only a proposed publication-state compatibility Rule. It carries no thresholds and grants no production eligibility.
