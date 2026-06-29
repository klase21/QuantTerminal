# Macro Freshness Certification

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D16  
**Implementation under review:** D15 - Macro Freshness and Source Envelope  
**Decision:** CERTIFIED WITH BLOCKER

## 1. Certification Scope

This certification reviews the D15 Macro freshness and source-envelope change
only. It verifies that the existing Stooq-backed Macro path reports provenance
and freshness truthfully while preserving its legacy API contract. It does not
approve a new provider, fallback, interpretation, confidence score, or Macro
narrative.

The relevant P1 audit item is `RES-08`, with `RES-10` providing the associated
provenance requirement. The approved behavior is explicit `UNAVAILABLE` when a
trusted source timestamp or usable observation is absent.

## 2. Source Certification

**Result: PASS**

- The active Macro client requests only the Stooq public CSV quote endpoint.
- The canonical registry identifies `stooq-macro` as the approved provider and
  `macro` as the normalized QuantTerminal source.
- The active Macro route and client do not use Yahoo, FRED, CoinGecko, mock
  sources, or any newly introduced external provider.
- No unapproved fallback is attempted when Stooq is unavailable.

Stooq remains the only approved production Macro provider used by this path.
The registry relationship from `macro` to `stooq-macro` is source identity, not
permission to substitute another provider.

## 3. API Certification

**Result: PASS**

- Legacy top-level fields remain present: `ok`, `source`, `updatedAt`, `items`,
  and `unavailableReason` when applicable.
- `_source` is additive; the response is not wrapped and legacy keys are not
  renamed or removed.
- The envelope is produced through the canonical data-governance helpers.
- `retrievedAt` records request retrieval time only.
- `lastUpdatedAt` remains `null` when no trusted source timestamp is available.
- The unavailable branch returns HTTP 200 with the legacy unavailable payload
  plus explicit `_source` metadata, preserving consumer compatibility.

The client retains Stooq's raw `sourceDate` and `sourceTime` fields when quotes
are available. D15 correctly does not convert those fields into a canonical
timestamp because their timezone semantics have not been established.

## 4. Freshness Certification

**Result: PASS**

- Freshness uses only the canonical vocabulary: `LIVE`, `CURRENT`, `STALE`,
  `EXPIRED`, and `UNAVAILABLE`.
- `evaluateFreshness()` receives `lastUpdatedAt: null`; therefore retrieval time
  cannot cause provider data to be marked `CURRENT`.
- Missing trusted source time resolves to `UNAVAILABLE` with
  `lastUpdatedAt: null`.
- No current time is substituted as a source observation timestamp.

### Approved-Source Blocker

Read-only provider probes performed during D16 confirmed:

- Stooq quote endpoint: HTTP `404`.
- Stooq historical endpoint: HTTP `200` with an HTML JavaScript browser
  verification challenge rather than source CSV data.

The historical challenge must not be bypassed in this certification sprint.
Until access to an approved source is remediated, the canonical and truthful
freshness state is `UNAVAILABLE`.

## 5. UI Certification

**Result: PASS**

### Dashboard

- Macro remains summary context only.
- Macro observations are consumed only when `_source.freshnessStatus` is
  `LIVE`, `CURRENT`, or `STALE`.
- `UNAVAILABLE` or missing source metadata cannot become Dashboard reasons or
  information-flow evidence.
- Display time is derived from `_source.lastUpdatedAt`, not the legacy retrieval
  timestamp.

### Research

- Macro remains supporting context in Narrative Timeline and Source
  Intelligence.
- Research applies the same source-backed freshness gate.
- When Macro is unavailable, it reports unavailable coverage and the explicit
  source reason.
- Research does not generate a thesis, evidence, confidence, interpretation, or
  narrative from unavailable Macro data.

## 6. No-Fabrication Certification

**Result: PASS**

The reviewed implementation contains:

- no placeholder Macro values;
- no synthetic Macro confidence;
- no fake source timestamps;
- no generated Macro narrative;
- no substitution from Yahoo, FRED, CoinGecko, mock data, or another unapproved
  provider.

An unavailable approved source remains unavailable rather than being replaced
with inferred or fabricated content.

## 7. Known Limitations

- The Stooq quote endpoint currently returns HTTP `404`.
- The Stooq historical endpoint currently presents a JavaScript anti-bot/browser
  verification challenge instead of CSV data.
- No approved Macro fallback is currently available.
- Macro remains `UNAVAILABLE` until approved Stooq access is remediated or a
  fallback is approved through data-governance review.
- Yahoo and FRED remain prohibited unless governance explicitly changes.

## 8. Certification Decision

**CERTIFIED WITH BLOCKER**

D15 is certified because it preserves compatibility, uses only the approved
source, and prevents retrieval time from masquerading as source freshness. The
remaining failure is an upstream approved-source access blocker, not an
implementation defect. No API or page correction is warranted in D16.

## 9. Validation Record

The certification validation includes:

- TypeScript compilation;
- Dashboard integration audit;
- intelligence smoke tests;
- production build;
- prohibited-source scan over the active Macro route, client, Dashboard, and
  Research consumers;
- read-only Stooq quote and historical endpoint probes.

Final command results are recorded in the Sprint D16 completion summary.
