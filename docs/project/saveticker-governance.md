# SaveTicker Governance

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D26  
**Decision:** REGISTERED

## 1. Classification

SaveTicker is classified as a **Production External Source**.

The `/api/kr-retail` route makes a direct HTTPS request to the SaveTicker public
news API. SaveTicker originates news records and source-provided `created_at`,
view-count, vote-count, tag, and top-story observations. QuantTerminal does not
create or persist those source observations before retrieval.

SaveTicker is therefore not runtime state, a cache, or a persistence layer. It
is also not the derived KR Retail product. `deriveKRRetailReaction` combines
normalized SaveTicker and Coinness records into a separate reaction surface;
that derivation does not change the classification of either upstream source.

## 2. Implementation and Consumers

| Concern | Current implementation |
| --- | --- |
| External endpoint | SaveTicker public news-list API requested by `app/api/kr-retail/route.ts` |
| Normalization | `core/krRetail/deriveKRRetailReaction.ts` maps SaveTicker records to KR Retail signals |
| Immediate consumer | `/api/kr-retail` |
| Page consumers | None identified in the current frozen six-page runtime |
| Shared Product Context | No SaveTicker or KR Retail field is written or read |
| Combined source | Coinness is fetched independently and combined only after both requests settle |

The registry `consumers: ["research"]` value records canonical product-domain
ownership and the only currently appropriate page family. It does not claim
that Research presently fetches `/api/kr-retail`.

## 3. Registry Integration

SaveTicker is registered with the following canonical metadata:

| Field | Decision |
| --- | --- |
| `id` | `saveticker` |
| `displayName` | `SaveTicker` |
| `authority` | SaveTicker public news API |
| `owner` | Research |
| `consumers` | Research |
| `cacheable` | `false`; the current request explicitly uses `no-store` |
| `criticality` | `P2`; supplementary regional reaction context, not a critical market-data dependency |
| `quality` | `MEDIUM`; direct public provider observations with no canonical coverage validation yet |
| governance freshness | `CURRENT`; this is a registry default, not runtime evidence |
| source status | `ACTIVE` |
| fallback source | None |
| production approved | `true` |

The source registry usage audit no longer treats the `saveticker` identifier as
an unregistered-source watch term. It now resolves usage through the canonical
registry entry.

## 4. Ownership

**Owner:** Research. SaveTicker contributes regional news and crowd-reaction
context. It does not own market prices, market structure, opportunity ranking,
evidence conclusions, Replay validation, or Trade execution.

**Consumers:** The current runtime consumer is the internal `/api/kr-retail`
derivation. Research is the approved page-domain consumer. No current page or
Shared Product Context handoff consumes SaveTicker directly.

**Freshness responsibility:** A future canonical runtime evaluation must use a
valid SaveTicker item `created_at` timestamp. The latest valid source
observation may be `CURRENT` for 15 minutes, `STALE` through 6 hours, and
`EXPIRED` afterward. Missing, malformed, or future timestamps must produce
`UNAVAILABLE`; request time must never replace source time.

**Health responsibility:** Health must be derived by the canonical Health
Runtime from registered identity, evaluated freshness, runtime quality, and
source status. The current connector `ok` flag describes transport success
only and is not canonical source health.

**Fallback policy:** None. Coinness can keep the combined KR Retail surface
partially populated when SaveTicker is unavailable, but it is a sibling source
with different observations, not a provenance-preserving SaveTicker fallback.

**Criticality:** P2. Failure must degrade the KR Retail surface without
blocking product pages or being replaced with fabricated SaveTicker data.

## 5. Envelope Decision

**Decision: EXPOSE NONE for the current `/api/kr-retail` response.**

The endpoint combines SaveTicker and Coinness into one derived payload. Adding
a SaveTicker `_source` envelope would incorrectly attribute Coinness records
and derived reaction metrics to SaveTicker. Adding a derived KR Retail source
ID in D26 would exceed this sprint and has not been approved by governance.

A future envelope sprint may either:

* register a canonical derived KR Retail source with constituent provenance;
  or
* add a supported multi-source metadata contract.

Until then, the current legacy response shape remains unchanged. SaveTicker
does not inherit another source envelope and no canonical freshness or health
claim is emitted by `/api/kr-retail`.

## 6. Architecture Audit

| Check | Result | Evidence |
| --- | --- | --- |
| Duplicates market-data ownership | PASS | SaveTicker supplies news and reaction observations, not prices, structure, movers, or opportunities. |
| Bypasses Source Governance | PASS AFTER REGISTRATION | The external authority now has a canonical ID, owner, consumers, quality, freshness policy, and criticality. |
| Fabricates timestamps | PASS | SaveTicker normalization retains `item.created_at`; API `fetchedAt` and surface `generatedAt` describe retrieval/derivation only. |
| Fabricates freshness | PASS | The route emits no canonical freshness and does not promote `fetchedAt` or `generatedAt` to source freshness. |
| Bypasses Health Runtime | PASS | The route makes no canonical health claim; connector `ok` remains transport diagnostics. Future health must use the Health Runtime. |
| Duplicates fallback data | PASS | Coinness remains an independent partial constituent and is not registered as a SaveTicker fallback. |
| Shared-context leakage | PASS | No SaveTicker field is inserted into Shared Product Context. |

No SaveTicker fetch, normalization, score, response field, timeout, cache mode,
or consumer behavior changed in D26.

## 7. Known Limitations

* `/api/kr-retail` has no canonical envelope because its derived multi-source
  identity is not registered.
* Runtime freshness and health are not yet calculated for SaveTicker.
* SaveTicker coverage and response-shape validation remain local to the current
  route and normalizer.
* No frozen product page currently consumes the KR Retail response.

These are governance and future integration limits, not permission to invent
data or infer source health.

## 8. Validation

* TypeScript (`npx.cmd tsc --noEmit --pretty false --incremental false`): PASS.
* Source Registry validation: PASS, 33 production sources and no issues.
* Freshness Rules validation: PASS, 33 policies with no missing, unknown, or
  invalid source IDs.
* Source Registry Usage audit: REPORT_ONLY; 33/33 sources matched, SaveTicker
  resolved through `/api/kr-retail`, and watched unregistered findings reduced
  from 1 to 0.
* Dashboard Integration Audit: PASS.
* Intelligence Smoke Test: PASS, 10 checks passed and 0 failed.
* Production build (`npm run build`): PASS; 55 static pages generated.
* SaveTicker API behavior changes: none.
* Shared Product Context changes: none.
* Package changes: none.
