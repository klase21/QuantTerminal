# QuantTerminal Master Roadmap

**Status:** Canonical strategic roadmap  
**Audience:** Product leaders, engineers, architects, reviewers, AI systems, and contributors  
**Scope:** Long-term evolution, strategic priorities, capability roadmap, expansion roadmap, and platform vision  

## 1. Roadmap Mission

The roadmap exists to guide QuantTerminal's long-term evolution without
turning strategy into a fixed implementation calendar.

It answers:

```text
Where is the platform going?
Why does that direction matter?
Which capabilities must mature before others can safely exist?
How should future work remain aligned with the mission?
```

The roadmap is capability-driven rather than feature-driven because durable
platforms are built from reusable abilities, not isolated screens. A feature
may solve one workflow. A capability creates a foundation that many workflows
can share.

Roadmap decisions must align with:

- the mission and principles in `MASTER_PLAN.md`;
- the system boundaries in `MASTER_ARCHITECTURE.md`;
- the engineering governance in `MASTER_ENGINEERING.md`;
- the user experience philosophy in `MASTER_PRODUCT.md`.

The roadmap should prevent reactive growth. It should make future expansion
deliberate, composable, and evidence-backed.

## 2. Evolution Vision

QuantTerminal evolves through a sequence of platform identities.

```text
Evidence Platform
  -> Reasoning Platform
  -> Visual Intelligence Platform
  -> Personal AI Market Analyst
  -> Enterprise Intelligence Platform
  -> Open Intelligence Ecosystem
```

### Evidence Platform

The first identity is a platform that collects, validates, stores, projects,
and presents source-backed evidence. This foundation creates trust before
interpretation.

### Reasoning Platform

The second identity adds bounded reasoning over evidence. Reasoning explains
relationships, conflicts, historical analogs, and uncertainty without
fabricating facts or replacing user judgment.

### Visual Intelligence Platform

The third identity turns evidence and reasoning into clear visual workflows:
charts, timelines, replay, research maps, flow diagrams, evidence cards, and
guided investigations.

### Personal AI Market Analyst

The fourth identity introduces personalized AI assistance. The analyst helps
users navigate evidence, remember context, compare cases, and plan
investigations. It remains subordinate to repository facts and human
authority.

### Enterprise Intelligence Platform

The fifth identity adds governance, repeatability, permissions, exports,
team workflows, auditability, and enterprise integrations.

### Open Intelligence Ecosystem

The final identity is an extensible ecosystem where new providers, markets,
agents, plugins, SDKs, and enterprise applications can plug into the same
evidence-first architecture.

## 3. Capability Roadmap

Capabilities define what QuantTerminal can reliably do across many future
features.

| Capability group | Purpose | Expected outcomes | Dependencies | Long-term value |
| --- | --- | --- | --- | --- |
| Data Foundation | Create durable, source-backed market history and availability metadata. | Repository facts, coverage, projections, freshness, provider transparency. | Provider governance, repository, identity, validation. | Trustworthy base layer for every future workflow. |
| Automation | Run bounded collection, refresh, sync, and validation flows without blocking users. | Manual runners, schedulers, workers, projection refresh, sync orchestration. | Data Foundation, Engineering governance, runtime boundaries. | Keeps evidence current while preserving responsiveness. |
| Reasoning | Interpret evidence relationships without fabricating facts. | Explanations, contradictions, historical analogs, confidence boundaries. | Evidence readiness, repository facts, context lineage. | Turns facts into understandable intelligence. |
| Visualization | Make complex market evidence readable quickly. | Evidence cards, charts, timelines, heatmaps, replay narratives, visual summaries. | Evidence, product hierarchy, design system maturity. | Reduces cognitive load and supports fast understanding. |
| Research | Support deep investigation and thesis validation. | Source-aware research views, narrative flows, conflict review, related cases. | Repository, Evidence, Reasoning, Replay. | Helps users build and audit conviction. |
| Replay | Reconstruct historical market windows safely and responsively. | Bounded dataset loading, repository-backed replay, optional heavy evidence. | Repository coverage, projections, bounded query contracts. | Converts historical facts into explainable market events. |
| Intelligence | Combine evidence, reasoning, visuals, and context into decision support. | Market state summaries, contradictions, evidence packets, investigation paths. | Data Foundation, Reasoning, Visualization, Research. | Makes the terminal feel coherent rather than fragmented. |
| Collaboration | Allow teams to share, review, and preserve market understanding. | Shared research, evidence exports, comments, review flows, team workspaces. | Product consistency, enterprise identity, audit trails. | Turns individual insight into organizational knowledge. |
| Enterprise | Provide oversight, integration, governance, and repeatability. | Permissions, APIs, exports, review logs, compliance-friendly evidence trails. | Repository, Documentation, Engineering, Collaboration. | Makes QuantTerminal usable in professional organizations. |
| Platform | Enable extensibility through providers, plugins, SDKs, APIs, and agents. | Plugin architecture, domain expansion, multi-agent workflows, external integrations. | Architecture stability, provider independence, governance. | Allows growth without rewriting the system. |

## 4. Strategic Phases

Strategic phases describe durable stages of platform maturity. They are not
release dates.

| Phase | Name | Goal |
| --- | --- | --- |
| Phase 1 | Evidence Foundation | Establish source-backed facts, repository identity, coverage, projection, and availability semantics. |
| Phase 2 | Automation Foundation | Add safe orchestration for collection, sync, projection refresh, and routine validation. |
| Phase 3 | Reasoning Foundation | Introduce bounded interpretation that references evidence, highlights uncertainty, and avoids unsupported claims. |
| Phase 4 | Visual Intelligence | Make evidence and reasoning visually understandable through charts, timelines, maps, cards, and replay narratives. |
| Phase 5 | Product Experience | Refine complete user journeys across Dashboard, Markets, Scanner, Trade, Replay, and Research. |
| Phase 6 | Cross-Market Expansion | Extend evidence-first architecture to additional markets, chains, macro sources, and asset classes. |
| Phase 7 | Enterprise Platform | Add team governance, auditability, exports, permissions, APIs, and operational reliability. |
| Phase 8 | Open Intelligence Ecosystem | Enable plugins, SDKs, external agents, marketplace participation, and domain-specific extensions. |

Each phase depends on the earlier phases retaining their integrity. Reasoning
without evidence is not progress. Visual intelligence without source
transparency is decoration. Enterprise scale without governance is fragility.

## 5. Expansion Strategy

Every new domain must plug into the existing architecture:

```text
Provider
  -> Source Governance
  -> Repository
  -> Coverage
  -> Projection
  -> Evidence
  -> Reasoning
  -> Presentation
```

Expansion does not bypass the repository, evidence, or no-fabrication rules.

### Hyperliquid

Hyperliquid should enter as a market-structure and execution-context vertical
with source-governed data, repository-backed evidence, and clear provider
semantics.

### Ethereum

Ethereum should enter through chain data, fees, flows, protocol activity,
staking, liquidity, and entity-aware evidence where source quality permits.

### Solana

Solana should enter through chain activity, liquidity, DeFi flows, protocol
events, and ecosystem evidence with explicit availability and provider limits.

### Bitcoin

Bitcoin should combine market data, derivatives, ETF, macro, mining, network,
and reserve evidence without collapsing distinct evidence types into one
generic signal.

### Prediction Markets

Prediction markets should provide probability evidence, not product certainty.
They must remain timestamped, source-backed, and clearly separated from
QuantTerminal reasoning.

### Macro

Macro should explain context and constraints. It must not invent regime
labels, rate interpretations, or cross-asset conclusions without evidence.

### Government Data

Government data should enter as slow-moving, source-transparent evidence with
clear release timing, revision behavior, and availability state.

### Equities

Equities should adopt the same evidence hierarchy while respecting sessions,
filings, corporate actions, market structure, and venue semantics.

### RWA

RWA expansion should prioritize provenance, liquidity, freshness, and
comparability. It must avoid overstating precision where markets are opaque.

### ETF Intelligence

ETF intelligence should connect flows, holdings, creation and redemption
activity, premiums, discounts, and market impact through source-backed
evidence.

### Corporate Filings

Filings should enter as structured evidence for events, risk, ownership,
capital structure, and narrative change. Interpretation belongs to future
reasoning layers.

### Enterprise APIs

Enterprise APIs should expose bounded, source-transparent, repository-backed
contracts rather than raw ungoverned data.

### SDK

The SDK should help external users compose evidence, coverage, and projections
without bypassing provenance or availability semantics.

### Plugin Marketplace

Plugins should add providers, verticals, views, agents, and workflows through
documented boundaries. Marketplace growth must preserve trust and architecture
coherence.

## 6. Product Evolution

The user experience evolves from orientation toward personal intelligence.

```text
Today
  -> Dashboard
  -> Evidence
  -> Replay
  -> Research
  -> Decision Support
  -> Automation
  -> Personal Intelligence
```

### Today

The current experience orients users around market state, source-backed
evidence, replay, research, and manual investigation.

### Dashboard

Dashboard becomes the fastest path to understand what matters now and which
evidence supports that state.

### Evidence

Evidence becomes the reusable product unit across pages, workflows, exports,
alerts, and future reasoning.

### Replay

Replay becomes the historical verification layer, letting users inspect what
happened in bounded windows without sacrificing responsiveness.

### Research

Research becomes the deep investigation layer for thesis support, conflict,
narrative context, and source review.

### Decision Support

Decision support connects evidence, reasoning, replay, and research while
preserving human authority.

### Automation

Automation keeps data, evidence, projections, and workflows current without
moving interpretation out of approved boundaries.

### Personal Intelligence

Personal intelligence adapts layout, context, saved workflows, and assistant
behavior to the user while preserving canonical facts and terminology.

## 7. Technology Evolution

Technology evolves to support durable product capabilities.

### Repository Maturity

Repository maturity means broader provider coverage, stronger identity,
better freshness, richer metadata, and reliable auditability.

### Reasoning Maturity

Reasoning maturity means interpretations become more useful while remaining
bounded, evidence-referenced, and reviewable.

### Visualization Maturity

Visualization maturity means more market structure becomes legible through
charts, timelines, maps, flows, and evidence-driven visual narratives.

### Automation Maturity

Automation maturity means routine collection, sync, validation, projection,
and evidence refresh can run safely without blocking users.

### Plugin Maturity

Plugin maturity means external domains can enter through explicit contracts
instead of ad hoc integrations.

### AI Agent Maturity

AI agent maturity means specialized agents can plan, inspect, explain,
validate, and review while remaining constrained by evidence and governance.

### Enterprise Maturity

Enterprise maturity means the platform supports permissions, audit trails,
exports, APIs, review workflows, and operational reliability.

## 8. AI Evolution

AI capabilities should evolve through specialized responsibilities.

### Research Agent

The Research Agent helps organize theses, supporting evidence, conflicting
evidence, sources, and related historical context.

### Replay Agent

The Replay Agent helps navigate historical windows, surface relevant bounded
datasets, and explain event sequence without fabricating missing data.

### Evidence Agent

The Evidence Agent evaluates readiness, warnings, missing evidence,
experimental evidence, and source quality.

### Reasoning Agent

The Reasoning Agent connects evidence into bounded interpretations and marks
uncertainty clearly.

### Review Agent

The Review Agent challenges unsupported claims, source gaps, product
inconsistency, and architectural drift.

### Planning Agent

The Planning Agent helps sequence work while respecting master documents,
roadmap phases, and engineering governance.

### UI Agent

The UI Agent helps translate evidence and workflows into consistent visual
experiences aligned with `MASTER_PRODUCT.md`.

### Automation Agent

The Automation Agent helps run and inspect scheduled or manual workflows
without owning business interpretation.

The human remains the final decision maker. AI should make evidence easier to
understand, not harder to audit.

## 9. Success Milestones

Success milestones are qualitative states, not dates.

### Evidence Complete

Core evidence sources are source-governed, repository-backed, coverage-aware,
and presented with clear availability semantics.

### Repository Complete

Historical facts, provider metadata, identity, projection, freshness, and
bounded query paths are reliable enough to support product and reasoning.

### Reasoning Ready

Reasoning can explain evidence relationships, contradictions, uncertainty,
and historical context without fabricating facts.

### Visual Intelligence Ready

The product can turn complex market evidence into clear visual narratives
across Dashboard, Replay, Research, and future workflows.

### Automation Ready

Routine sync, projection refresh, validation, and monitoring can run without
manual intervention while preserving responsiveness and auditability.

### Enterprise Ready

The platform supports team workflows, governance, exports, permissions,
review, audit trails, and reliable operational boundaries.

### Platform Ready

External domains, plugins, agents, APIs, and SDKs can extend QuantTerminal
without bypassing architecture or evidence rules.

## 10. Strategic Non-Goals

QuantTerminal will not become:

- a signal-selling platform;
- a prediction-only platform;
- a copy-trading platform;
- a news aggregation platform;
- a social media platform;
- an engagement-first product;
- a black-box AI advisor;
- a broker execution engine;
- a hype dashboard;
- a provider wrapper without intelligence.

These non-goals protect trust. Signal selling pressures the product toward
unsupported certainty. Prediction-only workflows collapse evidence into
outcomes. Copy trading removes human authority. News aggregation increases
noise without structure. Black-box AI hides the source trail. Engagement-first
products optimize attention instead of understanding.

QuantTerminal should remain an evidence-driven intelligence platform.

## 11. Roadmap Governance

Roadmap changes require:

- mission alignment;
- architecture alignment;
- engineering review;
- product review;
- diagram impact review;
- MASTER document review;
- no-fabrication review;
- protected-system review where relevant.

Roadmap changes should be evolutionary rather than reactive. A new opportunity
may adjust sequencing, but it should not redefine the mission, bypass
architecture, or introduce unsupported product promises.

Capability additions should answer:

```text
Does this strengthen the evidence platform?
Does this preserve repository and source transparency?
Does this improve user understanding?
Does this respect human decision authority?
Does this compose with future expansion?
```

If the answer is no, the roadmap item should be rejected, reframed, or
deferred.

## 12. Evolution Principles

- Long-term maintainability over short-term velocity.
- Capabilities over features.
- Evidence over speculation.
- Visual understanding over information overload.
- Composable architecture over monolithic systems.
- Platform thinking over point solutions.
- Human judgment remains authoritative.
- Source transparency over hidden intelligence.
- Bounded workflows over expensive synchronous processing.
- Provider independence over provider lock-in.
- Documentation before expansion.
- Governance before scale.

These principles keep the roadmap aligned with the permanent constitution of
the project.

## 13. Future Diagram Roadmap

The diagram system should expand as the platform matures.

### Architecture Diagram Pack

The architecture pack remains the canonical system-level visual reference.
It should evolve when ownership, data flow, runtime flow, or plugin boundaries
change.

### Product Diagram Pack

The product pack should describe navigation, page ownership, evidence card
composition, user journeys, and progressive disclosure.

### Reasoning Diagram Pack

The reasoning pack should describe evidence-to-interpretation boundaries,
contradiction handling, confidence semantics, and review flows.

### Automation Diagram Pack

The automation pack should describe scheduling, workers, sync, projection
refresh, retry, and operational safety.

### Expansion Diagram Pack

The expansion pack should describe how new markets, chains, providers, and
plugins enter the platform.

### Enterprise Diagram Pack

The enterprise pack should describe permissions, audit trails, exports,
review workflows, API boundaries, and organization-level intelligence.

## 14. Future Documentation Roadmap

The five permanent MASTER documents remain the governing set:

- `MASTER_PLAN.md`;
- `MASTER_ARCHITECTURE.md`;
- `MASTER_ENGINEERING.md`;
- `MASTER_PRODUCT.md`;
- `MASTER_ROADMAP.md`.

Future canonical documents may include:

- `MASTER_REASONING`;
- `MASTER_AUTOMATION`;
- `MASTER_AI`;
- `MASTER_DESIGN_SYSTEM`;
- `MASTER_EXPANSION`.

These future documents remain subordinate to the five permanent MASTER
documents. They may specialize ownership, vocabulary, and review rules, but
they must not redefine the mission, architecture, engineering process, product
constitution, or roadmap direction.

## 15. Roadmap Pyramid

Strategy flows downward. Implementation follows strategy, never the reverse.

```text
Vision
  -> Capabilities
  -> Products
  -> Features
  -> Implementation
```

Vision defines the destination. Capabilities define durable platform powers.
Products turn capabilities into user experiences. Features express product
needs in bounded form. Implementation realizes those features through the
engineering system.

When implementation pressure conflicts with the pyramid, the pyramid wins.
The roadmap protects QuantTerminal from becoming a collection of urgent
features without a coherent platform direction.

QuantTerminal evolves by making real evidence increasingly useful, visual,
explainable, personal, collaborative, and extensible.
