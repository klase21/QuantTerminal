# Shared Product Context Runtime

This directory implements the version 1 runtime infrastructure defined in
`docs/project/shared-product-context-contract.md`. It transports owned,
source-backed context between product pages without making product pages share
their internal state or recompute upstream decisions.

No product page consumes this library yet.

## Modules

- `types.ts`: versioned envelope, payload aliases, provenance wrappers, enums,
  and structured result types.
- `schema.ts`: dependency-free structural validation, timestamp checks, expiry
  enforcement, and JSON-safety checks.
- `serialize.ts`: non-throwing JSON serialization and deserialization.
- `sessionStorage.ts`: SSR-safe, non-throwing tab-scoped persistence.
- `handoff.ts`: minimal typed envelope builders for canonical page handoffs.
- `conflict.ts`: lifecycle statuses, audit metadata, validation inspection, and
  revision conflict detection.
- `merge.ts`: deterministic merge policy for complete context revisions.
- `lifecycle.ts`: active memory registry, persistence, updates, expiration,
  clearing, and audit retention.
- `index.ts`: public exports.

## V1 Storage Strategy

V1 is designed for a hybrid handoff:

1. Stable identity may later travel in the URL: `contextId`, `symbol`,
   `exchange`, `timeframe`, `sourcePage`, and `destinationIntent`.
2. Rich context is serialized under
   `quantterminal.product-context.v1:<contextId>` in `sessionStorage`.
3. Page integration and URL helpers are intentionally deferred.

Full evidence, historical datasets, orderbooks, and sensitive execution inputs
must not be placed in URL parameters or this lightweight context envelope.

## Unavailable Behavior

All public persistence and serialization functions return
`ProductContextResult<T>`. They do not throw for malformed data, expired
contexts, unavailable storage, or browser storage failures. Missing and null
values are preserved; the library never creates thesis, evidence, validation,
or execution content.

An expired context is rejected with `expired_context`. Missing browser storage
is reported as `storage_unavailable`. A missing key is reported as `not_found`.
Product pages must eventually translate these results into explicit partial or
unavailable states rather than fallback intelligence.

## SSR Safety

The storage adapter checks for `window` before accessing `sessionStorage` and
also catches browser security and quota errors. Server rendering therefore
returns a structured unavailable result instead of throwing.

## Handoff Construction

Handoff helpers require real identity, creation, and expiry metadata from the caller.
Research-to-Replay requires an existing replay target and carries a thesis only
when Research has one;
Replay-to-Trade requires existing validation and replay results. Helpers create
only envelope metadata and never manufacture timestamps or page-owned payloads.
They should be invoked from explicit handoff actions, not during render.

## Lifecycle

The lifecycle manager exposes `createContext`, `updateContext`, `mergeContext`,
`expireContext`, and `clearContext`. Every operation is non-throwing and returns
one of four statuses:

- `SUCCESS`: the operation completed without lifecycle issues.
- `WARNING`: the operation completed with a recoverable condition, such as
  unavailable browser storage or an equal-revision deterministic merge.
- `CONFLICT`: applying the operation would violate revision, identity, or
  expiration rules.
- `ERROR`: input, timestamp, TTL, or persistence state is invalid.

Active contexts are retained in memory and mirrored to `sessionStorage`.
Storage unavailability does not discard a valid in-memory result; it produces a
warning. Product pages remain disconnected from this manager.

## Revision Rules

- `updateContext` requires an exact `expectedRevision` and increments it once.
- A revision lower than the active revision is a stale-write conflict.
- A higher unexpected base revision is a revision-mismatch conflict.
- A newer merged revision must have a later `updatedAt`.
- Equal revisions are duplicate revisions and use deterministic merge.
- `schemaVersion`, `contextId`, and `createdAt` are immutable.

## Merge Rules

For a newer incoming revision, fields explicitly present on that revision win,
including explicit `null`; omitted fields remain unchanged. For equal revisions,
non-null values fill null values, then the existing value wins. This makes
equal-revision merges deterministic without inventing data.

Merge never reactivates expired context and never overwrites a newer revision
with an older one.

## Expiration and Inspection

`expiresAt` is validated against `createdAt`, `updatedAt`, and the current time.
Active operations reject expired context. `expireContext` moves the full
snapshot from the active registry into an inspection-only memory archive and
removes its active `sessionStorage` entry. `inspectContext` can read that
archived snapshot, but it cannot make it active again.

## Clear Policy

`clearContext` removes active and expired full payloads from memory and removes
the `sessionStorage` entry. It is safe when the storage key is already absent.
Compact audit metadata is retained when a lifecycle record was available.

## Future Migration

A future server-side context store can retain the same versioned envelope and
replace the storage adapter. That migration will require authentication,
authorization, retention, privacy, and API contracts. Until then,
`sessionStorage` remains tab-scoped and cannot provide cross-device or
shareable rich-context continuity. Server synchronization must preserve
optimistic revision checks, immutable fields, deterministic equal-revision
merges, expiration tombstones, and audit metadata.
