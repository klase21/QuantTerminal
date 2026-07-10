# QuantTerminal Master Plan

**Status:** Canonical project constitution  
**Audience:** Executives, contributors, engineers, reviewers, and AI systems  
**Scope:** Mission, principles, philosophy, and long-term direction  

## Mission

QuantTerminal exists to turn real market evidence into usable market
understanding.

It helps users see what is happening, why it may matter, what evidence supports
or weakens that view, and what remains unknown. The product must reduce
confusion without pretending to remove uncertainty.

## Vision

QuantTerminal will become an intelligence terminal for digital-asset markets:
a professional workspace where live data, historical context, source
governance, evidence packets, replay, research, and future reasoning systems
work together without fabricating certainty.

The long-term product is not a charting tool, a dashboard mosaic, or a trading
bot. It is a disciplined intelligence environment that preserves source truth,
compresses complexity, and keeps human judgment in control.

## Core Philosophy

QuantTerminal is built on observed evidence.

Every conclusion must be traceable to source-backed facts, bounded
interpretation, or explicit unavailability. Missing evidence is not a weakness
to hide. It is a condition to show clearly.

The product must prefer being incomplete and honest over being complete and
wrong.

Core beliefs:

- Real evidence is more valuable than confident narrative.
- Freshness, provenance, and coverage are part of meaning.
- Historical context matters only when its source and limits are visible.
- Intelligence should compress complexity, not invent certainty.
- Human judgment remains the final decision layer.

## Product Principles

QuantTerminal presents information in the order users need it:

```text
Conclusion
  -> Reason
  -> Evidence
  -> Detail
```

The product should make the primary state of a page understandable quickly,
then allow deeper inspection when the user asks for it.

Product surfaces must:

- show the main state before raw analytics;
- expose evidence quality and freshness;
- degrade gracefully when data is unavailable;
- preserve responsiveness over completeness;
- separate observation from prediction;
- keep dense professional workflows readable;
- avoid turning missing data into implied meaning.

Each page has a job. Dashboard summarizes. Markets verifies live structure.
Scanner finds opportunities. Trade supports execution planning. Replay
reconstructs historical windows. Research investigates implications.

No page should absorb work that belongs to another page merely because the data
is available.

## AI Principles

AI in QuantTerminal must operate under evidence discipline.

AI systems may help organize, compare, retrieve, summarize, or reason over
approved evidence. They must not fabricate observations, timestamps,
confidence, outcomes, patterns, recommendations, or source availability.

AI output must remain distinguishable from facts. When reasoning is added, it
must be versioned, traceable, and constrained by source-backed evidence.

AI principles:

- no unsupported conclusions;
- no hidden source substitution;
- no invented confidence;
- no fabricated market context;
- no trade execution authority;
- no replacement of human judgment.

AI should make the user more capable, not more dependent on an opaque answer.

## Architecture Philosophy

QuantTerminal architecture must preserve boundaries.

Facts, evidence, interpretation, product presentation, operations, and future
automation must remain separate enough that each can be audited independently.
Data should move forward through the system without upstream mutation.

Architecture should favor:

- one-way dependency flow;
- deterministic identity;
- immutable factual records;
- versioned knowledge records;
- explicit lifecycle states;
- repository-only persistence for durable facts;
- bounded reads for responsive product surfaces;
- clear unavailable states instead of silent fallback.

Architecture should avoid hidden coupling, broad rewrites, circular
dependencies, and systems that require expensive synchronous work before a user
can understand the page.

## Repository Philosophy

The Repository is the durable memory of observed facts and versioned records.

It exists to preserve what was known, when it was known, where it came from,
and how it can be replayed or audited later. It must not become a reasoning
engine or a place where missing facts are repaired by assumption.

Repository principles:

- facts are immutable;
- writes are idempotent;
- duplicate input must not create duplicate truth;
- provider metadata must remain visible;
- projections may accelerate reads but must not replace source facts;
- historical records must preserve provider timestamps;
- unsupported data remains unavailable.

The Repository enables intelligence by protecting evidence integrity first.

## Evidence Philosophy

Evidence is the bridge between data and understanding.

Evidence must carry source, freshness, coverage, availability, provider tier,
and limitation context. It should help users and future reasoning systems know
what can be trusted, what is partial, and what is missing.

Evidence is not automatically intelligence. Coverage metadata is evidence of
availability, not a claim about market direction. Experimental evidence may be
useful, but it must never be presented as canonical truth.

Evidence principles:

- source-backed before interpreted;
- explicit limitations before confidence;
- availability is not meaning;
- experimental data is labeled;
- missing evidence stays visible;
- evidence packets prepare reasoning but do not perform it.

## Reasoning Philosophy

Reasoning is a future knowledge layer, not a substitute for evidence.

Reasoning may compare historical cases, detect patterns, evaluate conditions,
or produce structured conclusions only after the underlying facts, evidence,
coverage, and lineage are ready.

Reasoning must remain:

- evidence-bound;
- versioned;
- reviewable;
- reversible by newer evidence;
- separated from execution;
- honest about uncertainty.

Reasoning must never convert absence of evidence into neutrality, confidence,
or recommendation.

## UI Philosophy

The interface should feel like a professional intelligence terminal: dense,
fast, calm, and precise.

QuantTerminal should preserve its terminal-inspired identity while making the
first answer easier to see. The UI must not force users to reverse-engineer
the product from raw widgets.

UI principles:

- conclusion before analytics;
- drivers before raw data;
- evidence near every claim;
- freshness visible where trust depends on it;
- manual load for heavy historical workflows;
- graceful failure instead of blocking;
- compact language over long narratives;
- density with hierarchy, never density as noise.

The UI should make uncertainty legible.

## Engineering Philosophy

Engineering work must protect truth, responsiveness, and boundaries.

The project favors small, targeted changes that preserve existing behavior and
respect accepted architecture decisions. Validation should match risk, and no
implementation should claim more than the sources prove.

Engineering principles:

- real data only;
- no mock evidence in production paths;
- minimal changes over broad rewrites;
- responsiveness over completeness;
- graceful unavailability over incorrect values;
- validation before certification;
- documentation as part of the system;
- protected systems require explicit intent.

Build, release, and validation details belong in `MASTER_ENGINEERING.md`.

## Documentation Philosophy

Documentation is part of the product architecture.

The documentation system must preserve both current truth and historical
evidence. Master documents orient. Domain documents define current ownership.
Sprint reports, audits, certifications, ADRs, and investigations remain source
records.

Documentation principles:

- every canonical document has one owner;
- master documents explain durable direction;
- sprint documents preserve evidence;
- ADRs preserve decisions;
- investigations preserve empirical findings;
- archive does not mean delete;
- future AI sessions must read from canonical sources before acting.

Documentation must reduce ambiguity without rewriting history.

## Expansion Philosophy

QuantTerminal should expand by strengthening evidence integrity before adding
interpretation or automation.

New capabilities should enter in layers:

```text
Source-backed facts
  -> Repository
  -> Coverage
  -> Projection
  -> Evidence
  -> Replay and Research
  -> Reasoning
  -> Automation
  -> Execution support
```

Expansion must not bypass the earlier layers. A powerful feature built on
unclear evidence is not progress.

Future systems may become autonomous only after their inputs, boundaries,
failure modes, and review paths are explicit.

## Long-Term Roadmap

The long-term path is:

1. Preserve the certified factual foundation.
2. Keep historical datasets fresh through governed synchronization.
3. Use coverage and projections to make historical evidence responsive.
4. Expand Replay and Research around repository-backed evidence.
5. Build evidence packets that are complete enough for bounded reasoning.
6. Introduce reasoning layers only after no-fabrication gates are satisfied.
7. Add automation only where jobs are idempotent, observable, and reversible.
8. Keep product surfaces focused on user understanding, not system spectacle.
9. Mature from market intelligence workspace into evidence-governed decision
   support.

The roadmap may change. These ordering principles should not.

## Success Metrics

QuantTerminal succeeds when:

- users understand the main market state quickly;
- evidence quality and missing data are visible;
- pages remain responsive under partial data;
- historical replay and research can be trusted;
- repository records are durable, auditable, and duplicate-safe;
- future reasoning can trace every conclusion to evidence;
- AI systems follow the same no-fabrication rules as engineers;
- contributors can understand where work belongs;
- architecture boundaries remain clear as the system grows;
- the product earns trust by saying `UNAVAILABLE` when truth is unavailable.

The ultimate metric is not how much data QuantTerminal shows. It is how safely
and quickly it turns real evidence into usable understanding.

## Project Motto

```text
Real evidence. Clear judgment. No fabricated certainty.
```
