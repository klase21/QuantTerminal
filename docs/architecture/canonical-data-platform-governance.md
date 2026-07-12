# Canonical Data Platform Governance

## Purpose

D1 establishes the contracts that govern canonical data before storage or consumer migration. It does not activate persistence, population, publication, or page integration.

## Governance Flow

```text
Governed provider
  -> immutable raw object
  -> structural and semantic quality evaluation
  -> canonical normalization and identity
  -> immutable record version
  -> coverage and consistency certification
  -> projection and evidence
  -> publication gate
  -> canonical scope
  -> consumer read model
```

Population completion is not publication. A candidate is publishable only after its provider, identity, quality, consistency, watermark, and publication policy are independently admissible.

## Ownership

The Canonical Data Platform is the single canonical owner for governed datasets. Providers own source observations; normalization owns schema conversion; quality owns rule outcomes; coverage owns completeness; consistency owns cross-surface equivalence; evidence owns cited readiness; consumers own presentation only.

## Independent State Dimensions

Lifecycle, availability, coverage, freshness, data quality, consistency, provider certification, evidence readiness, analytical confidence, and publication status are independent contracts. No universal health or confidence field may replace them.

## Provider Governance

Provider registration controls tier, certification, dataset scope, limitations, and version. Admissibility requires a sufficient tier, production-permitted certification, matching dataset scope, and a publication policy that accepts the provider's limitations. Experimental providers publish only to explicitly experimental read models. Provider tier is not analytical confidence.

## Dataset Governance

The registry defines one canonical owner, schema and identity rules, policy references, storage intent, replay capability, dependencies, consumers, and traceability for each dataset. Numeric SLAs and thresholds remain `PROPOSED` until operational evidence supports approval.

## Quality and Publication

Quality rules are versioned and classified as structural, identity, temporal, domain, statistical, lineage, or publication rules. Mandatory `NOT_EVALUATED` results are not success. Checksum conflicts quarantine; critical failures reject; consistency mismatches, stale projection watermarks, and unapproved experimental publication hold.

## Quarantine

Quarantine retains the immutable raw reference, attempted identity, failed rules, conflicts, normalization attempts, operator decision, and repair history. Repairs are explicit events; canonical facts are superseded, never silently overwritten.

## D1 Boundary

D1 contains TypeScript contracts, declarative registries, deterministic helpers, and contract tests only. It performs no requests, SQL, persistence, population, scheduling, API integration, or consumer integration.
