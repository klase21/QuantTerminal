# Cron Adapter Foundation

The Cron Adapter is the provider-neutral trigger translation boundary for
Phase 5. It accepts an external scheduling trigger, normalizes it into an
immutable trigger record, and emits an immutable Scheduler activation request.

It does not schedule time, run Scheduler logic, execute jobs, invoke Worker or
Phase 4 runtimes, or persist records.

## Purpose and Ownership

Cron Adapter owns:

* external trigger normalization;
* trigger identity and duplicate validation;
* trigger lifecycle;
* Scheduler activation-request construction; and
* safe serialization of those contracts.

Cron Adapter never owns:

* execution timing or dependency readiness;
* Scheduler plan creation or lifecycle;
* job execution or Worker dispatch;
* retry policy or backoff;
* Repository or StorageAdapter behavior;
* signal evaluation, outcome creation, Historical Memory, Learning,
  Confidence Calibration, or Playbooks;
* AI, broker execution, or UI.

## Trigger Model

An immutable `TriggerRequest` contains:

```text
triggerId
provider
requestedAt
triggerType
executionScope
metadata
```

Providers are a closed vocabulary:

```text
LOCAL
VERCEL
GITHUB_ACTIONS
MANUAL
```

These are provider identities only. No provider implementation, SDK, request
handler, token, environment variable, or deployment behavior exists here.

Trigger types are `SCHEDULED` and `MANUAL`. `executionScope` is an opaque,
non-empty caller-owned scope label. Metadata is opaque JSON-safe data and is
deep-frozen. The adapter does not interpret either field.

`triggerId` is deterministic from provider plus canonical `requestedAt`.
Equivalent deliveries from the same provider at the same instant therefore
share one identity. Trigger-set validation rejects duplicate identities.

## Scheduler Activation Request

An immutable `SchedulerActivationRequest` contains:

```text
activationId
triggerId
executionPlanIds
activationReason
```

Only a `NORMALIZED` trigger may produce an activation request. Plan IDs must be
explicit, non-empty, and unique. They are sorted for deterministic identity.
`activationId` is derived from trigger ID, sorted plan IDs, and reason.

An activation request is a handoff contract only. Cron Adapter does not import
Scheduler Runtime and never calls `activateExecution()`, creates an
`ExecutionPlan`, resolves dependencies, or advances Scheduler lifecycle.

## Lifecycle

Trigger lifecycle is forward-only:

```text
RECEIVED -> VALIDATED -> NORMALIZED -> ACTIVATED -> ARCHIVED
    |           |             |
    +-----------+-------------+-> REJECTED -> ARCHIVED
```

All transition timestamps are caller supplied. The adapter reads no ambient
clock. Transitions return new frozen records and append history. `ACTIVATED`
and `REJECTED` records can only be archived; `ARCHIVED` has no outgoing state.

Merge requires the incoming record to preserve the immutable request and the
entire existing history as an exact prefix. Activation requests may merge only
when identical.

## Scheduler and Worker Relationships

Future orchestration may pass `SchedulerActivationRequest` to a Scheduler
integration that loads the referenced plans and applies Scheduler Runtime
readiness rules. That integration is not part of this module.

Cron Adapter has no Worker relationship beyond the wider one-way architecture.
It cannot claim jobs, dispatch handlers, return Worker results, or create
downstream execution IDs.

## Future Provider Integrations

Future Vercel Cron integration may translate an authenticated route invocation
into `CreateTriggerRequestInput`. It must keep HTTP and environment behavior
outside this adapter.

Future GitHub Actions integration may translate an explicit workflow event
into the same provider-neutral input. It must not execute jobs directly.

Future Local Runner integration may create `LOCAL` triggers and consume
activation requests. Timing loops, process control, and plan loading remain in
the runner, not this adapter.

## Query and Serialization

Query types support trigger ID, provider, lifecycle, and requested-time range.
No search implementation exists.

Serialization validates before JSON encoding. Deserialization reparses,
revalidates deterministic identity and lifecycle, and reconstructs immutable
records. No persistence format is implied.

## Strict No-Business-Logic Policy

The adapter treats execution plan IDs, execution scope, activation reason, and
metadata as references or opaque caller data. It never infers which plan
should run, whether a signal is valid, what an outcome means, or what should be
learned.

## Intentionally Not Implemented

This module includes no:

* Vercel Cron route or provider adapter;
* GitHub Actions workflow or provider adapter;
* Local Runner or timing loop;
* API, Worker, Worker Pool, queue, thread, or process;
* Scheduler Runtime import, execution, readiness, or lifecycle logic;
* Repository, StorageAdapter, database, or persistence call;
* signal capture, price collection, evaluation, outcome, memory, learning,
  confidence, Playbook, AI, broker execution, or UI.

