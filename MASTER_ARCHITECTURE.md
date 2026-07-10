# QuantTerminal Master Architecture

**Status:** Canonical technical constitution  
**Audience:** Architects, engineers, reviewers, contributors, and AI systems  
**Scope:** Durable system architecture, layer ownership, data flow, and architectural decisions  

## 1. Architecture Principles

QuantTerminal architecture exists to protect evidence integrity while keeping
the product responsive enough to use. It separates facts from interpretation,
durable history from projections, reasoning from presentation, and collection
from user-facing workflows.

### Repository First

Durable factual records belong in the Repository before they become inputs to
coverage, evidence, replay, research, or future reasoning. Request paths and
product surfaces may read bounded summaries or projections, but they must not
become hidden ingestion or reconstruction engines.

Repository-first architecture gives QuantTerminal an auditable memory: what
was observed, where it came from, when it was observed, and which provider
tier governed its trust.

### Immutable Historical Facts

Historical facts do not change in place. Corrections, reconciliations, and
new provider evidence must preserve prior facts and publish new versioned or
append-only records where required.

This keeps replay, research, and future reasoning from silently changing the
past.

### Evidence Before Reasoning

Reasoning may only operate after evidence is collected, validated, covered,
projected, and marked with limitations. Evidence packets prepare reasoning;
they are not reasoning themselves.

Missing evidence must remain visible. Absence must never become neutrality,
confidence, or recommendation.

### Projection Instead Of Expensive Scans

Large historical datasets are not request-path query targets. Expensive scans
belong in manual, background, or bounded computation paths. Product surfaces
consume projections, caches, and bounded reads.

Projection is not a shortcut around truth. It is a responsive view over facts.

### Explainability Before AI Conclusions

AI and reasoning layers may be introduced only when their inputs, lineage,
limitations, and no-fabrication boundaries are explicit. A conclusion that
cannot be traced to evidence does not belong in QuantTerminal.

### Separation Of Collection And Interpretation

Collectors gather source-backed facts. Validators check shape, identity,
timestamps, freshness, and provider metadata. Repository stores. Coverage
measures completeness. Projection prepares fast availability reads. Evidence
packages readiness. Reasoning interprets later. Presentation visualizes.

No layer should do the job of the next layer merely for convenience.

## 2. System Context

The highest-level architecture is:

```text
Providers
  -> Collectors
  -> Validation
  -> Repository
  -> Coverage
  -> Projection
  -> Evidence
  -> Reasoning
  -> Presentation
  -> User
```

### Providers

Providers are external or internal source systems that expose market,
context, historical, operational, or research evidence. Provider identity,
provider tier, source ownership, timestamp semantics, and availability limits
must be explicit.

Providers do not define product meaning.

### Collectors

Collectors retrieve or receive provider-backed facts. They own bounded
collection and source-specific normalization into approved records. They do
not infer missing data, generate signals from hindsight, or write directly to
storage adapters.

### Validation

Validation owns source shape, timestamp order, deterministic identity,
provider metadata, coverage contract, and no-fabrication enforcement.
Validation rejects malformed or unsupported records rather than repairing them
with assumptions.

### Repository

Repository owns durable history. It stores immutable facts, versioned records,
opaque payloads, parent references, idempotency keys, provider metadata, and
operational records through provider-neutral persistence contracts.

Repository does not perform AI, scoring, presentation, or market reasoning.

### Coverage

Coverage owns completeness measurement. It answers whether expected records
exist for a dataset, symbol, and time boundary under that dataset's resolution
contract.

Coverage does not claim market direction or intelligence.

### Projection

Projection owns fast availability views over repository facts and coverage
results. Projection records carry lifecycle, freshness, lineage, source
record counts, and recomputation state.

Projection exists so product and API paths do not trigger expensive scans.

### Evidence

Evidence owns readiness containers. It turns source and projection metadata
into structured evidence packets that describe what is available, missing,
partial, experimental, canonical, verified, or constrained.

Evidence does not predict, explain price movement, or create conclusions.

### Reasoning

Reasoning owns versioned interpretation over evidence and historical memory.
It may compare cases, generate structured hypotheses, or produce bounded
conclusions only when evidence gates allow it.

Reasoning does not fabricate facts, provider support, confidence, or trade
recommendations.

### Presentation

Presentation owns visualization, user workflow, page hierarchy, and graceful
degradation. It shows conclusion, reasons, evidence, and detail in the right
order while preserving unavailable states.

Presentation does not own business logic, persistence, collection, or
reasoning authority.

## 3. Container Architecture

QuantTerminal is organized around major containers with explicit ownership.

### Historical Repository

The Historical Repository is the durable historical fact boundary. It stores
source-backed records, provider metadata, deterministic identities, parent
references, and operational lineage.

Its purpose is not to answer every product question directly. Its purpose is
to preserve truth so other layers can read from it safely.

### Coverage Engine

The Coverage Engine evaluates repository completeness according to each
dataset contract. It understands expected cadence, variable event streams,
experimental datasets, provider availability status, and strict UTC
boundaries.

Coverage is an audit layer, not an intelligence layer.

### Projection Engine

The Projection Engine publishes precomputed coverage and availability
summaries. It carries lifecycle and freshness metadata so consumers can fail
closed when projections are stale or missing.

Projection is the response-time contract for historical availability.

### Evidence Engine

The Evidence Engine builds immutable evidence packets from approved
projection and availability metadata. It separates canonical, experimental,
missing, and constrained evidence.

Evidence exists to give future reasoning systems safe inputs.

### Replay

Replay is the historical event inspection surface. It may consume repository
data only through coverage gates, bounded dataset reads, and adapters that
preserve unavailable states.

Replay must remain responsive. Heavy datasets are manual, bounded, cached, or
degraded.

### Research

Research is the deep investigation workspace. It may consume repository
coverage and evidence summaries through manual, projection-gated paths.

Research does not automatically convert coverage into intelligence or memory.

### Runtime

Runtime owns canonical record models, deterministic identity, lifecycle,
validation, serialization, merge rules, and Facts-vs-Knowledge boundaries.

Facts are immutable. Knowledge is versioned. Runtime does not own storage,
network, UI, schedulers, AI, or broker execution.

### Scheduler

Scheduler owns execution timing, dependency readiness, retry scheduling
metadata, execution identity, and execution plan lifecycle.

Scheduler activates work; it does not perform business logic.

### Workers

Workers own claiming, dispatch, structured execution results, and execution
lineage. They invoke approved handlers through explicit boundaries.

Workers execute jobs; they do not decide market meaning.

### Presentation Layer

The Presentation Layer owns page composition, state language, user workflow,
visual hierarchy, and interaction. It must use bounded reads and explicit
degraded states.

Presentation should make uncertainty legible rather than hiding it.

## 4. Component Architecture

### Historical Repository Components

- **Storage:** provider-neutral persistence boundary and concrete adapters.
- **Identity:** deterministic record identity and idempotency keys.
- **Persistence:** append-only or safely archived durable record handling.
- **Metadata:** provider tier, canonical flag, verification state,
  confidence, source timestamps, resolution, and coverage mode.
- **Dataset Registry:** dataset contracts, resolution semantics, expected
  cadence, and variable-stream rules.
- **Repository Mapper:** opaque runtime or historical records into storage
  envelopes without mutating payloads.

### Coverage Components

- **Evaluator:** computes coverage for one dataset, symbol, and UTC boundary.
- **Dataset Contract Resolver:** applies expected counts and resolution rules.
- **Provider Availability Reader:** distinguishes repository coverage from
  provider availability metadata.
- **Projection Writer:** publishes coverage summaries outside request paths.
- **Freshness Reader:** evaluates whether coverage information is usable.

### Projection Components

- **Projection Record:** immutable or lifecycle-versioned coverage summary.
- **Projection Lifecycle:** `AVAILABLE`, `STALE`, or `PROJECTION_MISSING`.
- **Freshness Evaluator:** determines whether projected data is still safe to
  consume.
- **Lineage Metadata:** source record count, repository watermark, computed
  time, and projection version.

### Evidence Components

- **Packet Builder:** creates structured evidence availability packets.
- **Readiness Classifier:** determines whether evidence is ready, partial,
  degraded, or insufficient.
- **Warnings:** records partial, missing, experimental, non-canonical, stale,
  or variable-stream constraints.
- **Confidence Boundary:** preserves provider confidence metadata without
  creating thesis confidence.

### Replay Components

- **Coverage Gate:** allows repository mode only when projection status is
  available.
- **Repository Client:** performs bounded repository reads.
- **Repository Adapter:** converts bounded records into Replay-compatible
  internal shapes without inference.
- **Manual Event Stream Loader:** keeps large event streams paginated and
  user-initiated.
- **Provider Mode:** remains a separate path and must not silently mask
  repository failures.

### Research Components

- **Coverage Client:** reads projection-only summaries.
- **Research Adapter:** prepares day-level dataset availability summaries.
- **Manual Load Boundary:** prevents automatic polling or hidden exact scans.
- **Investigation Boundary:** keeps coverage metadata out of unsupported
  reasoning outputs.

### Runtime Components

- **Facts Layer:** Signal Tracking, Signal Evaluation, Signal Outcome,
  Outcome Recorder, Historical Memory, and Context Snapshot.
- **Knowledge Layer:** Pattern, Learning, Confidence Calibration, and
  Playbook records.
- **Lifecycle:** forward-only transitions and terminal states.
- **Serialization:** safe, lossless, validated reconstruction.
- **Validation:** structured errors instead of normal-flow exceptions.

### Scheduler And Worker Components

- **Execution Plan:** deterministic job identity, dependencies, windows, and
  retry metadata.
- **Job Lifecycle:** forward-only execution states.
- **Dispatch Contract:** closed set of canonical job types.
- **Worker Result:** produced records, downstream execution references, and
  structured errors.
- **Operational Records:** scheduler runs, job states, worker locks, retry
  states, and dead letters.

### Presentation Components

- **Page Shells:** Dashboard, Markets, Scanner, Trade, Replay, Research.
- **State Language:** `LOADING`, `NO DATA`, `UNAVAILABLE`, `STALE`,
  `PARTIAL`, and related explicit states.
- **Evidence Cards:** source, freshness, coverage, limitations, and drilldown.
- **Degraded Modes:** visible fallbacks that do not fabricate missing values.

## 5. Data Flow

The canonical data lifecycle is:

```text
Provider
  -> Collector
  -> Validation
  -> Repository
  -> Coverage
  -> Projection
  -> Evidence
  -> Reasoning
  -> Presentation
```

### Mutation Boundaries

Mutation is allowed only before immutable publication or inside explicitly
operational state:

- collectors may assemble candidate records before validation;
- validators may reject candidates but must not fabricate missing fields;
- repository writes publish immutable facts or versioned records;
- operational records may advance lifecycle under forward-only rules;
- projections may be appended or safely refreshed according to their lifecycle
  contract;
- presentation state may change freely, but it is not source truth.

### Where Immutability Begins

Immutability begins when a fact crosses into the Repository or a runtime record
is finalized by its owning runtime. After that boundary:

- source timestamps do not change;
- provider identity does not change;
- evidence payloads do not change;
- deterministic identity does not change;
- downstream layers reference facts instead of rewriting them.

### Facts To Knowledge

Facts move forward into Historical Memory and evidence packets. Knowledge
layers may derive versioned interpretation only from approved upstream facts
and evidence. Knowledge never writes backward into facts.

## 6. Ownership Model

Every subsystem has exactly one primary responsibility owner.

| Subsystem | Owns | Does not own |
| --- | --- | --- |
| Providers | Source availability and source-native facts | Product meaning |
| Collectors | Bounded source collection | Interpretation or UI |
| Validation | Shape, identity, timestamps, metadata, no-fabrication checks | Storage implementation |
| Repository | Durable history and opaque persistence | AI, presentation, market meaning |
| Coverage | Completeness measurement | Provider fetching or reasoning |
| Projection | Fast availability views and freshness status | Source facts or exact scans in request paths |
| Evidence | Readiness and evidence limitations | Prediction, narratives, or recommendations |
| Reasoning | Versioned interpretation over evidence | Fact creation or source repair |
| Presentation | Visualization and user workflow | Business logic or persistence |
| Runtime | Canonical models and lifecycle contracts | Schedulers, storage, network, UI |
| Scheduler | Timing and readiness | Job execution or business logic |
| Workers | Claiming, dispatch, result lineage | Scheduling or market interpretation |

If ownership is unclear, the architecture defaults to the earlier layer for
facts and the later layer for presentation. Interpretation never moves
upstream.

## 7. Architecture Decision Records

These foundational ADRs are embedded in this master architecture as durable
principles. Detailed implementation ADRs may still live in `docs/decisions/`.

### ADR-001 Repository First

**Context:** QuantTerminal needs historical replay, research, evidence, and
future reasoning to agree on the same source of truth.

**Decision:** Durable facts and versioned records must enter the Repository
before they are used as canonical inputs to coverage, evidence, replay,
research, or reasoning.

**Consequences:** Consumers gain auditability, idempotency, provider metadata,
and lineage. Product features cannot claim canonical history from ad hoc
provider calls alone.

**Tradeoffs:** Repository-first design requires more upfront contracts and may
slow early feature experiments. The tradeoff is accepted because it protects
truth and future reasoning quality.

### ADR-002 Immutable Historical Facts

**Context:** Historical systems become unreliable if prior observations can be
quietly rewritten.

**Decision:** Historical facts are immutable after publication. Corrections
must use explicit new records, versions, or reconciliation metadata rather
than overwriting facts.

**Consequences:** Replay and research remain reproducible. Duplicate-safe
reruns can reject existing facts without changing them.

**Tradeoffs:** Storage and reconciliation become more explicit. Queries may
need to understand versions or correction lineage.

### ADR-003 Coverage Via Projection

**Context:** Exact coverage scans over large event streams are too expensive
for responsive request paths.

**Decision:** Product and API paths consume precomputed coverage projections.
Missing or stale projections fail closed and never trigger synchronous exact
coverage scans.

**Consequences:** Replay and Research stay responsive. Expensive coverage work
moves to manual, bounded, background, or scheduled contexts.

**Tradeoffs:** Projections can become stale and require lifecycle management.
Consumers must handle `STALE` and `PROJECTION_MISSING` explicitly.

### ADR-004 Evidence Never Bypasses Repository

**Context:** Evidence used by product and future reasoning must be traceable
and comparable.

**Decision:** Canonical evidence packets must be built from Repository-owned
facts, projections, or approved repository-derived metadata. They must not
silently bypass Repository for source-specific shortcuts.

**Consequences:** Evidence remains auditable and provider-transparent.
Reasoning inputs can cite lineage instead of trusting transient responses.

**Tradeoffs:** Some evidence may be unavailable until repository contracts
exist. The system prefers unavailable over unsupported evidence.

### ADR-005 Separation Of Evidence And Reasoning

**Context:** Availability metadata and source facts can be mistaken for market
intelligence if layers are blurred.

**Decision:** Evidence records readiness, limitations, canonical status,
experimental status, and missing data. Reasoning owns interpretation later.

**Consequences:** Evidence packets can safely exist before AI or reasoning is
authorized. Product surfaces can show evidence quality without implying a
market conclusion.

**Tradeoffs:** More explicit handoff is required between evidence and
reasoning. Early output may feel less decisive, but it remains truthful.

### ADR-006 Provider Independence

**Context:** Providers differ in coverage, timestamp semantics, trust level,
and availability.

**Decision:** Provider identity, tier, canonical status, verification state,
confidence, and source timestamp semantics must travel with records. No
provider may silently substitute for another.

**Consequences:** Canonical, verified, experimental, and unavailable data can
coexist without being confused. Unsupported symbols remain unavailable.

**Tradeoffs:** Provider mapping and capability checks add friction. The
friction is accepted to prevent hidden source substitution.

### ADR-007 Visualization First

**Context:** Users need to understand state quickly, even when underlying
systems are partial.

**Decision:** Presentation layers must prioritize clear visualization,
explicit state, bounded reads, and graceful degradation over exhaustive
request-time completeness.

**Consequences:** Product pages remain responsive. Heavy datasets are manual,
projected, cached, or unavailable with reasons.

**Tradeoffs:** Some advanced detail may require an extra action or background
preparation. This is preferable to slow pages or misleading completeness.

## 8. Non-Goals

The architecture intentionally avoids:

- Repository performing AI, scoring, prediction, or market interpretation.
- Coverage claiming market direction or thesis quality.
- Projection replacing source facts or repairing stale data.
- Evidence predicting markets or generating conclusions.
- Reasoning fabricating facts, timestamps, confidence, or provider support.
- Presentation owning business logic or durable truth.
- Request handlers performing heavy historical reconstruction.
- Schedulers evaluating signals or interpreting outcomes.
- Workers generating business meaning outside approved handlers.
- Provider fallbacks silently substituting unsupported data.
- AI producing recommendations without governed evidence and review.
- Broker execution or trade automation as an implicit product capability.

What cannot be supported honestly must be marked unavailable, stale, partial,
experimental, or not implemented.

## 9. Future Architecture

Future domains plug into the same layers:

```text
New Provider or Domain
  -> Provider Capability Contract
  -> Collector
  -> Validation
  -> Repository Record
  -> Coverage or Availability Model
  -> Projection
  -> Evidence Packet
  -> Reasoning Boundary
  -> Presentation Surface
```

### Plugin Architecture

Plugins should add providers, collectors, evidence types, presentation modules,
or reasoning modules through explicit contracts. A plugin must declare its
ownership boundary and cannot bypass Repository or evidence governance when it
claims canonical truth.

### Vertical Expansion

New verticals such as Hyperliquid, Macro, RWA, Equities, or Enterprise APIs
must enter through provider independence, source governance, dataset contracts,
and bounded read models. They do not receive special permission to bypass the
existing architecture.

### Enterprise APIs And SDK

External APIs and SDKs should expose stable, bounded, source-transparent
contracts. They should prefer projections, evidence packets, and explicit
unavailable states over raw unbounded repository access.

### Multi-Agent Support

Multi-agent systems may coordinate research, synchronization, validation, and
reasoning, but each agent must operate within the same evidence and ownership
rules. Agents may not create facts without sources or reinterpret
unavailable data as conclusions.

## 10. Architecture Evolution

### Past

QuantTerminal began with product surfaces, provider integrations, historical
experiments, and cache-oriented approaches. Those systems proved that
historical and evidence-rich workflows are valuable, but also showed that
heavy reconstruction and dashboard-first historical processing can harm
responsiveness.

### Current

The current v0.8 Data Foundation centers on Repository, deterministic
identity, provider metadata, historical datasets, coverage, projection,
Replay, Research, Evidence Packet boundaries, and certified runtime contracts.

The system is ready to build on facts without pretending that automation or
reasoning is already complete.

### Future

The future architecture advances in this order:

```text
v0.8 Data Foundation
  -> Automation
  -> Reasoning
  -> Visual Intelligence
  -> Expansion Platform
```

Automation will make sync, projection refresh, and bounded jobs repeatable.
Reasoning will interpret evidence under versioned no-fabrication rules.
Visual Intelligence will make evidence and interpretation legible in the
product. Expansion Platform work will generalize the model to new providers,
markets, domains, APIs, SDKs, and multi-agent workflows.

The architecture may evolve. Its core constraint should remain stable:

```text
Facts first. Evidence before reasoning. Responsive presentation. No fabricated certainty.
```
