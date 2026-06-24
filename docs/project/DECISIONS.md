# QuantTerminal Project Decisions

Status: Canonical project-level decision register  
Relationship: Complements detailed ADRs in `docs/decisions/`  

## Decision 001: No Synthetic Data

**Decision:** Production intelligence must use real observed data only.  
**Status:** Accepted  
**Context:** QuantTerminal surfaces evidence for market decisions. Fabricated,
mocked, or silently substituted data creates trust and safety risk.  
**Rationale:** A clear unavailable state is less harmful than a confident false
metric. Real-data discipline keeps audits, health checks, and user trust aligned.  
**Consequences:** Builders and UI must preserve missing states. Tests may use
fixtures only when isolated from production paths and clearly labeled.

## Decision 002: Binance First

**Decision:** Binance and Binance-compatible public data are the first-class
market data baseline where coverage exists.  
**Status:** Accepted  
**Context:** QuantTerminal needs liquid, long-coverage crypto market data for
funding, OI, OHLCV, reserves, and replay-adjacent evidence.  
**Rationale:** Binance provides broad symbol coverage, futures context, and
usable public endpoints. Other sources remain enrichment, not silent
substitutes.  
**Consequences:** Source-specific gaps must be visible. Non-Binance workflows
need explicit compatibility checks before being treated as equivalent.

## Decision 003: Conclusion -> Reason -> Evidence

**Decision:** Primary product surfaces follow conclusion, reason, evidence.  
**Status:** Accepted  
**Context:** Earlier pages exposed many metrics without making the market read
obvious.  
**Rationale:** Users need a fast answer, then the ability to inspect why. This
improves comprehension and prevents dashboard sprawl.  
**Consequences:** New panels must justify their place in the hierarchy. Raw
analytics should not appear above intelligence summaries.

## Decision 004: Deployable Snapshot Architecture

**Decision:** Small normalized intelligence snapshots may be committed and
served from Vercel; raw source data must not be committed.  
**Status:** Accepted  
**Context:** Runtime stores and local caches are not always available in
production. Dashboard and research surfaces need lightweight prepared payloads.  
**Rationale:** Deployable snapshots make product reads fast and stable while
preserving the cache-first architecture.  
**Consequences:** Artifacts require metadata, source hashes, size limits,
partition keys, and raw-data separation.

## Decision 005: Data Health Enforcement

**Decision:** Data health is a required gate for deployable intelligence.  
**Status:** Accepted  
**Context:** Generated timestamps alone do not prove evidence is current,
complete, or trustworthy.  
**Rationale:** Health checks distinguish current, stale, missing, invalid, and
unsupported evidence. Product surfaces can then avoid false `NO DATA` and false
freshness.  
**Consequences:** Feature acceptance must include relevant health audits.
Stale or missing evidence may still render, but it must be labeled.
