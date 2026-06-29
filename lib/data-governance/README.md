# Canonical Source Registry Runtime

This directory implements the production source metadata defined by
`docs/project/data-source-governance.md`.

## Scope

The registry is immutable runtime metadata. It does not fetch providers,
inspect source health, poll, modify APIs, or change page behavior. Its quality,
freshness, and status fields are governance defaults, not claims about current
network availability.

## Production-Only Policy

Only existing approved production authorities and derived data products are
registered. CoinGecko, Yahoo/FRED fallbacks, mock adapters, fixture
repositories, mock ingestion routes, and test sources are excluded.

SaveTicker is registered as a production external authority for its public
news, vote, and view observations. It is distinct from the derived KR Retail
surface that combines SaveTicker with Coinness; the combined response must not
claim SaveTicker-only provenance.

An inactive source must not be added as a disabled production record. It first
requires an update to the governance document and an approved implementation
sprint. `productionApproved` is therefore `true` for every canonical entry.

## Read-Only API

- `getSource(id)` returns one immutable definition or `undefined`.
- `listSources()` returns all registered definitions.
- `listActiveSources()` returns definitions with `ACTIVE` status.
- `listProductionSources()` returns production-approved definitions.
- `validateSourceRegistry()` returns structured validation issues.

Lookup helpers do not mutate the registry. Definitions and consumer arrays are
frozen when the module loads.

## Validation

Registry validation detects duplicate IDs, inactive production entries,
missing owners, missing authorities, missing fallback references, and fallback
loops. `SOURCE_REGISTRY_VALIDATION` contains the validation result for the
canonical registry.

## No-Fabrication Rule

Registry metadata never supplies provider values, observations, timestamps,
scores, or replacement records. Missing source data remains unavailable.
Fallbacks must point to another approved registry entry and must preserve
their own provenance and degraded status when future consumers are connected.

## Source Metadata Envelope

Sprint D4 adds a reusable source-backed result envelope without changing any
existing API payload. The envelope is a discriminated union:

- `SUCCESS` contains non-empty caller-provided data.
- `DEGRADED` contains caller-provided data plus a canonical degradation reason.
- `UNAVAILABLE` contains metadata only and never creates placeholder data.

`createSourceSuccess`, `createSourceDegraded`, and
`createSourceUnavailable` resolve identity and production approval through the
registry. Unknown, disabled, unavailable, or missing-data inputs fail closed to
an `UNAVAILABLE` result.

`retrievedAt` records envelope creation time. It never fills `lastUpdatedAt`.
When observation freshness is not supplied, freshness remains `UNAVAILABLE`
and quality remains `UNKNOWN`; registry defaults are not presented as runtime
health claims.

`fallbackSourceId` records an actual fallback used by a caller. The configured
registry fallback is not copied automatically because configuration does not
prove that fallback data supplied a response.

Cache status uses `HIT`, `MISS`, `STALE`, `BYPASS`, `UNAVAILABLE`, or
`UNKNOWN`. It describes the current result path, not whether the registry says
a source is cacheable.

Runtime guards validate the result discriminator, required metadata, canonical
enum values, timestamps, and the presence or absence of data. They validate
shape only; they do not establish provider truth.

No page or API consumes the registry or envelope in Sprint D4. D5 may apply the
envelope to one explicitly selected low-risk API.

## Freshness Policy Runtime

Sprint D9 adds pure freshness evaluation for every canonical registry source.
It does not poll providers, inspect the network, modify envelopes, or change API
responses.

Freshness is calculated from a trusted `lastUpdatedAt` and an explicit
`retrievedAt` evaluation anchor. The runtime never calls `Date.now()` and never
uses retrieval time as a missing observation timestamp. Missing, null,
malformed, or future observation timestamps return `UNAVAILABLE`.

Each registered source has an explicit policy in `freshnessRules.ts`. There is
no global fallback threshold. Rules reflect the source-specific windows in
`docs/project/data-source-governance.md`; callers may provide an explicit
policy only when its `sourceId` matches the source being evaluated.

Age-based policies can return `LIVE`, `CURRENT`, `STALE`, or `EXPIRED`.
Age-independent historical policies still require valid timestamps and reject
future timestamps, but age alone does not expire immutable evidence. Identity,
schema, checksum, and coverage validation remain separate responsibilities.

`evaluateFreshness` resolves source identity and policy through the registry.
`calculateFreshness` evaluates an explicit policy. Summary helpers count and
list current, stale, expired, and unavailable sources without fetching or
mutating data.

The envelope may consume these results in a future integration sprint. D9 does
not retrofit either pilot API or infer freshness for existing payloads.

## Source Health Runtime

Sprint D10 derives one canonical health level from registered source identity,
runtime freshness, runtime quality, source status, and canonical degradation or
unavailable reasons. The allowed levels are `HEALTHY`, `DEGRADED`,
`UNAVAILABLE`, `DISABLED`, and `UNKNOWN`.

Health is derived rather than stored as an independent provider claim.
`DISABLED` and `UNAVAILABLE` source states take precedence. Stale data, low
quality, an explicit degraded status, or a degradation reason produce
`DEGRADED`. Expired or indeterminate freshness follows the source criticality
policy: P0 sources fail closed to `UNAVAILABLE`, while P1 and P2 sources may
remain `DEGRADED` or `UNKNOWN` for inspection.

Registry quality and freshness values remain governance defaults. They are not
substituted for missing runtime evaluations. A source becomes `HEALTHY` only
when it is production approved and active, freshness is explicitly `LIVE` or
`CURRENT`, quality is explicitly `HIGH` or `MEDIUM`, and no degraded or
unavailable reason is present. Missing required metadata never becomes
`HEALTHY`.

`calculateSourceHealth` evaluates canonical metadata directly.
`evaluateSourceHealth` resolves identity, criticality, approval, and default
source status through the registry while accepting runtime freshness and
quality. Summary helpers group evaluated sources by health. The registry
summary marks every unevaluated registered source as `UNKNOWN`, preventing a
partial evaluation from implying fleet-wide health.

The runtime is pure and performs no polling, route calls, or network checks. A
future internal diagnostics endpoint may expose caller-supplied evaluations,
but D10 does not modify any API response or page behavior.
