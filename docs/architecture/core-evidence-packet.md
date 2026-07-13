# Core Evidence Packet

## Purpose

A Core Evidence Packet is the immutable structured output of bounded Evidence assembly. It organizes certified Consistency Results for later Evidence work without adding confidence, causal claims, generated prose, publication, projection, or consumer behavior.

The packet retains separate collections for supporting, conflicting, contextual, missing, unsupported, inapplicable, and blocking evidence. It also retains exact Result references, inherited exact Fact references, Event-Time and Knowledge-Time bindings, profile and policy versions, bounded diagnostics, structured conclusion and uncertainty codes, lineage, schema version, and checksum.

## Assembly

Assembly accepts an immutable request and profile. It normalizes candidates, validates temporal equality and no-lookahead, applies profile-owned role rules, sorts semantically unordered content, derives business and version identities, and computes a canonical checksum. Missing required supporting evidence yields `INSUFFICIENT`; blocking inputs yield `BLOCKED`; wholly inapplicable requirements yield `NOT_APPLICABLE`.

Structured conclusion codes only describe the bounded evidence composition: `EVIDENCE_SUPPORTS`, `EVIDENCE_CONFLICTS`, `EVIDENCE_MIXED`, `EVIDENCE_INSUFFICIENT`, `EVIDENCE_BLOCKED`, or `NOT_APPLICABLE`. They are not market direction, confidence, causality, or advice.

## Persistence

Migration `008_core_evidence_assembly.sql` adds D4-owned immutable profile, identity, candidate, packet-version, reference, requirement, lineage, and conflict tables. It is additive because the Phase 1 Evidence blueprint references the pre-certification Result table and cannot preserve certified immutable Result identities.

One transaction persists the Packet version and every authoritative link. Immutable triggers reject update or delete. Advisory locking plus unique deterministic identities distinguish `CREATED`, request-level `REUSED`, command-level `DUPLICATE`, and incompatible `CONFLICT`. Unknown commit acknowledgement is reconciled by version identity and checksum.
