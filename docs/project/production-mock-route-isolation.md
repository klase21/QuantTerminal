# Production Mock Route Isolation

**Project:** Theta - Data Intelligence Platform  
**Phase:** 3  
**Sprint:** D25  
**Status:** Implemented  
**Scope:** The eleven protected mock-backed routes recorded by D24

## 1. Purpose

D24 found eleven API routes whose handlers could expose fixture, mock-adapter,
or mock-repository output through production route paths. D25 isolates those
paths without deleting protected historical tooling, changing page behavior,
or replacing unavailable information with fabricated production data.

The isolation boundary is implemented by
`lib/runtime/nonProductionRouteIsolation.ts`. In production it always fails
closed before protected mock logic runs. Outside production, protected logic
requires an explicit caller opt-in.

## 2. Isolation Policy

Production behavior:

* protected mock-only handlers return HTTP `404`;
* the response is `{ ok: false, status: "UNAVAILABLE", reason: "This route is disabled." }`;
* caller headers and query parameters cannot bypass the production denial;
* responses set `Cache-Control: no-store`;
* no mock payload, secret, environment name, provider configuration, or
  repository detail is returned.

Development and test behavior:

* access without an explicit gate returns HTTP `403` and `UNAVAILABLE`;
* callers may opt in with header
  `x-quantterminal-non-production-route: enabled`;
* callers may alternatively use query parameter
  `nonProductionRoute=enabled`;
* after opt-in, the existing handler executes unchanged.

The external-review enqueue route is mixed-purpose. Its default and explicit
mock modes are isolated, while the pre-existing `mode: "live"` Polymarket path
remains available and retains its existing validation.

## 3. Route Inventory

| Route | Current purpose | Production risk | Classification | Isolation applied |
| --- | --- | --- | --- | --- |
| `/api/historical-intelligence/external-adapters/preview` | Preview fixture-backed external event adapters. | Could present preview fixtures as provider output. | Development/demo only | Entire handler gated. |
| `/api/historical-intelligence/external-review/enqueue` | Enqueue adapter previews for review; defaults to mock mode and also supports live Polymarket. | Omitted mode could enqueue mock review data in production. | Internal review; mixed mock/live | Default and mock branches gated; existing live branch retained. |
| `/api/historical-intelligence/ingestion/mock-event` | Exercise historical-event ingestion with a mock event. | Could persist fabricated historical input. | Test/development only | Entire handler gated. |
| `/api/historical-intelligence/market-memory` | Query the fixture-backed Market Memory engine. | Could expose mock memory as historical intelligence. | Development/demo only | Entire handler gated. |
| `/api/historical-intelligence/persistence/decisions` | Read mock decision persistence records. | Could expose fixtures as durable decisions. | Test/development persistence | Entire handler gated. |
| `/api/historical-intelligence/persistence/events` | Read mock event persistence records. | Could expose fixtures as durable events. | Test/development persistence | Entire handler gated. |
| `/api/historical-intelligence/persistence/memories` | Read mock memory persistence records. | Could expose fixtures as durable memories. | Test/development persistence | Entire handler gated. |
| `/api/historical-intelligence/persistence/outcomes` | Read mock outcome persistence records. | Could expose fixtures as observed outcomes. | Test/development persistence | Entire handler gated. |
| `/api/historical-intelligence/persistence/playbooks` | Read mock playbook persistence records. | Could expose fixtures as approved playbooks. | Test/development persistence | Entire handler gated. |
| `/api/historical-intelligence/persistence/replay-cases` | Read mock Replay case persistence records. | Could expose fixtures as historical cases. | Test/development persistence | Entire handler gated. |
| `/api/replay` | Serve the legacy mock Replay case catalog. | Could be mistaken for the real-data Replay V2 APIs. | Legacy development/demo route | Entire handler gated; Replay V2 provider routes are unchanged. |

## 4. Routes Isolated and Retained

All eleven D24 findings are isolated. Ten mock-only handlers are inaccessible
in production. The mock branch of external-review enqueue is also inaccessible
in production; only its already-existing live Polymarket branch is retained.

The route files and their backing repositories remain in place for explicit
development/test workflows. This avoids deleting protected historical,
ingestion, review, or persistence infrastructure. No route was moved, no API
payload was replaced, and no production provider was added.

## 5. Static Enforcement

`workers/intelligence-tests/auditProductionMockRouteIsolation.ts` verifies:

* all eleven route files import and invoke the shared isolation guard;
* production denial is evaluated before non-production opt-in;
* production returns `404` and canonical `UNAVAILABLE`;
* responses are not cached;
* header and query opt-ins both exist for development/test use;
* external-review enqueue gates its non-live branch;
* the guard does not inspect or expose secrets or environment values other
  than the production-mode check.

The earlier Source Registry Usage audit remains report-only and will continue
to identify mock terms in source files. A source finding now indicates retained
mock-backed code, not production reachability; the D25 isolation audit is the
enforcement check for reachability.

## 6. Remaining Blockers

There are no blockers within the eleven-route D25 scope. Broader findings from
D24 remain separate work: SaveTicker registration/ownership, source-envelope
migration, rollout-document refresh, and any deeper replacement of mock
historical repositories with approved source-backed persistence.

## 7. Validation

* TypeScript (`npx.cmd tsc --noEmit --pretty false --incremental false`): PASS.
* Dashboard Integration Audit: PASS.
* Intelligence Smoke Test: PASS, 10 checks passed and 0 failed.
* Production build (`npm run build`): PASS. The first sandboxed attempt could
  not open `.next/trace`; after its orphaned compiler processes were stopped,
  the clean permitted build compiled, type-checked, generated all 55 static
  pages, and completed route tracing successfully.
* Production Mock Route Isolation Audit: PASS, all 11 protected routes gated.
* Source Registry Usage Audit: REPORT_ONLY; 496 files and 76 API routes scanned,
  32/32 registered sources matched, 1 watched finding retained, and the same 11
  mock source findings retained behind the D25 isolation boundary.
* New providers or intelligence: none.
* Page behavior changes: none.
* Package changes: none.
