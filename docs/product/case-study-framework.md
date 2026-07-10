# Competitive Product Case Study Framework

**Status:** Canonical product research framework  
**Owner:** Product / Design  
**Scope:** Competitive product evaluation methodology for QuantTerminal  
**Related master documents:** `MASTER_PLAN.md`, `MASTER_PRODUCT.md`, `MASTER_ARCHITECTURE.md`, `MASTER_ENGINEERING.md`, `MASTER_ROADMAP.md`  

## Purpose

This framework defines how QuantTerminal evaluates competitive and adjacent
products.

The goal is not imitation. The goal is pattern extraction:

```text
Observe product behavior
  -> identify why it works
  -> separate pattern from surface style
  -> evaluate transferability
  -> adapt only when aligned with QuantTerminal principles
```

Every case study should preserve the product constitution:

- Evidence First;
- Visual First;
- Progressive Disclosure;
- Trust over Attention;
- Human Decision Authority;
- Repository-backed source transparency;
- no fabricated confidence, context, or certainty.

## Candidate Product Universe

### Core Products

| Product | Primary lens |
| --- | --- |
| Bloomberg Terminal | Professional density, workflow depth, command/navigation model, institutional trust. |
| TradingView | Chart-first experience, community overlays, discoverability, lightweight creation. |
| Koyfin | Cross-asset dashboards, research ergonomics, comparative financial workflows. |
| DefiLlama | Protocol intelligence, information grouping, crypto-native breadth. |
| CoinGlass | Derivatives dashboards, liquidation/funding/OI visualization. |
| Arkham | Entity intelligence, network exploration, investigation workflows. |
| Nansen | Wallet intelligence, labels, smart-money workflows, research surfaces. |
| Token Terminal | Fundamental crypto metrics, financial framing, protocol comparison. |
| Glassnode | On-chain analytics, cohort metrics, professional research workflows. |
| CryptoQuant | Exchange flows, miner/market analytics, signal-like dashboards. |

### Additional Products

| Product | Primary lens |
| --- | --- |
| Polymarket | Probability markets, event framing, market confidence presentation. |
| Hyperliquid | Trading interface, real-time market structure, performance expectations. |
| CoinAnk | Derivatives breadth, crypto market dashboards, data density. |
| Kaiko | Institutional data products, market data quality, research presentation. |
| Dune | Query-driven analytics, community dashboards, composable data storytelling. |

Products may be added when they represent a meaningful pattern category:
professional terminal, charting, derivatives, on-chain intelligence,
fundamentals, research, prediction markets, trading, data vendor, or community
analytics.

## Evaluation Principles

1. Evaluate the product as a system, not as screenshots.
2. Separate product pattern from visual styling.
3. Identify what the product makes easy and what it makes hard.
4. Score only observed behavior.
5. Mark unknowns as `UNAVAILABLE`, not assumed.
6. Do not infer internal implementation.
7. Do not treat popularity as quality.
8. Do not copy patterns that conflict with QuantTerminal's product invariants.
9. Prefer transferable principles over one-off features.
10. Every recommendation must explain why it fits QuantTerminal.

## Case Study Method

Each case study should follow the same research path:

1. Define the product identity.
2. Map the primary user workflows.
3. Inspect information architecture.
4. Inspect visualization language.
5. Inspect interaction and responsiveness.
6. Inspect decision-support model.
7. Identify strengths.
8. Identify weaknesses.
9. Extract transferable patterns.
10. Score each dimension.
11. Translate lessons into QuantTerminal opportunities.
12. Reject patterns that conflict with the master documents.

## Evaluation Template

Use this template for every competitor.

```markdown
# Product Case Study: [Product Name]

**Date reviewed:** [YYYY-MM-DD]  
**Reviewer:** [Name / Agent]  
**Product category:** [Terminal / Charting / Derivatives / On-chain / Research / Trading / Data vendor / Other]  
**Review scope:** [Pages, workflows, or surfaces reviewed]  
**Evidence basis:** [Observed directly / public docs / screenshots / videos / unavailable]  
**Limitations:** [Unavailable areas, login walls, paid-only features, unknowns]  

## 1. Product Identity

### Mission

[What the product appears to exist to do.]

### Target Users

[Beginner, professional, institutional, researcher, trader, developer, enterprise, etc.]

### Primary Value Proposition

[The main promise users receive.]

### Core Workflows

- [Workflow 1]
- [Workflow 2]
- [Workflow 3]

## 2. Information Architecture

### Homepage Hierarchy

[What appears first, second, third.]

### Navigation Model

[Tabs, command line, sidebar, search, dashboards, drilldowns, saved views.]

### Progressive Disclosure

[How the product moves from summary to depth.]

### Information Density

[Sparse, balanced, dense, expert-only, overwhelming.]

### Content Grouping

[How data, charts, tables, alerts, research, and workflows are grouped.]

## 3. Visualization

### Charts

[Chart types, readability, interaction, density.]

### Heatmaps

[Presence and effectiveness.]

### Timelines

[Event sequencing and historical context.]

### Tables

[Precision, scanability, sorting, filtering.]

### Cards

[Summary cards, evidence cards, metric cards.]

### Maps

[Geographic, market, liquidity, chain, or entity maps.]

### Networks

[Entity graphs, wallet graphs, relationship maps.]

### Animations

[Useful motion vs decorative motion.]

### Color Usage

[Semantic color, contrast, accessibility, overload.]

## 4. User Experience

### Onboarding

[First-run clarity, empty states, education, defaults.]

### Navigation

[How quickly users can move between workflows.]

### Learning Curve

[Beginner-friendly, professional-only, layered.]

### Interaction Model

[Click, command, drag, filter, hover, keyboard, saved layouts.]

### Feedback

[Loading, errors, unavailable states, confirmations, warnings.]

### Responsiveness

[Perceived speed and graceful degradation.]

### Mobile / Desktop

[Primary platform and cross-device behavior.]

## 5. Decision Support

### Decision Path

[How users move from data to action or understanding.]

### Evidence Presentation

[How the product shows source, freshness, quality, and support.]

### Context

[How the product explains why data matters.]

### Confidence

[How confidence, uncertainty, or quality is represented.]

### Historical Comparison

[Whether past cases, replay, analogs, or historical baselines are shown.]

### Reasoning

[Whether the product explains relationships or only displays data.]

## 6. Strengths

### What QuantTerminal Should Learn

- [Strength 1]
- [Strength 2]
- [Strength 3]

## 7. Weaknesses

### What QuantTerminal Should Avoid

- [Weakness 1]
- [Weakness 2]
- [Weakness 3]

## 8. Transferable Patterns

### Reusable Design Patterns

- [Pattern]

### Reusable Interaction Patterns

- [Pattern]

### Reusable Information Patterns

- [Pattern]

### Non-Transferable Patterns

- [Pattern and reason]

## 9. Product Score

| Dimension | Score | Justification |
| --- | ---: | --- |
| Product Identity | [1-10] | [Why] |
| Information Architecture | [1-10] | [Why] |
| Visualization | [1-10] | [Why] |
| User Experience | [1-10] | [Why] |
| Decision Support | [1-10] | [Why] |
| Transferability to QuantTerminal | [1-10] | [Why] |
| Overall Product Learning Value | [1-10] | [Why] |

## 10. QuantTerminal Implications

### Adopt

[Patterns that fit QuantTerminal.]

### Adapt

[Patterns that need transformation.]

### Avoid

[Patterns that conflict with QuantTerminal.]

### Follow-Up Questions

- [Question]
```

## Scoring Rubric

Scores should be comparative but grounded in observed product behavior.

| Score | Meaning |
| ---: | --- |
| 10 | Exceptional. Clear, differentiated, durable, and highly instructive. |
| 9 | Excellent. Strong pattern with minor limitations. |
| 8 | Very strong. Useful and transferable with adaptation. |
| 7 | Good. Works well but has visible tradeoffs. |
| 6 | Competent. Useful but not distinctive. |
| 5 | Mixed. Some value, but important gaps or friction. |
| 4 | Weak. Pattern exists but is poorly executed or hard to transfer. |
| 3 | Poor. Mostly not useful for QuantTerminal. |
| 2 | Very poor. Confusing, misleading, or misaligned. |
| 1 | Not useful. Should not influence QuantTerminal. |

Unknown or inaccessible areas should be marked `UNAVAILABLE` and excluded from
average scoring. Do not invent scores for unavailable evidence.

## Dimension Rubric

### Product Identity

Score the clarity of mission, audience, value proposition, and workflow focus.

High scores require:

- clear user target;
- obvious primary job;
- differentiated value;
- workflows that reinforce the product identity.

Low scores indicate:

- unclear audience;
- feature sprawl;
- conflicting workflows;
- value proposition hidden behind decoration.

### Information Architecture

Score the hierarchy, navigation, grouping, density, and disclosure model.

High scores require:

- fast orientation;
- coherent grouping;
- obvious next steps;
- graceful movement from summary to depth.

Low scores indicate:

- scattered data;
- excessive duplication;
- unclear page ownership;
- depth without orientation.

### Visualization

Score how well visual forms reveal meaning.

High scores require:

- charts that clarify state;
- semantic color;
- legible density;
- useful heatmaps, tables, timelines, maps, or networks where appropriate.

Low scores indicate:

- decoration without insight;
- unreadable density;
- color overload;
- visuals that imply unsupported conclusions.

### User Experience

Score usability, responsiveness, feedback, onboarding, interaction, and
cross-device behavior.

High scores require:

- responsive interaction;
- clear feedback;
- recoverable errors;
- sensible defaults;
- minimal cognitive load.

Low scores indicate:

- confusing onboarding;
- slow or blocking workflows;
- hidden state;
- hard-to-learn interactions without payoff.

### Decision Support

Score how effectively the product helps users reach understanding.

High scores require:

- evidence near claims;
- context;
- uncertainty or confidence semantics;
- historical comparison when useful;
- reasoning that remains auditable.

Low scores indicate:

- unsupported scores;
- hidden evidence;
- sensational conclusions;
- prediction without context;
- no path from data to understanding.

### Transferability to QuantTerminal

Score how well the observed patterns can be adapted to QuantTerminal.

High scores require:

- alignment with Evidence First;
- alignment with Visual First;
- repository/source transparency compatibility;
- fit with Dashboard, Markets, Scanner, Trade, Replay, or Research ownership.

Low scores indicate:

- engagement-first behavior;
- black-box reasoning;
- fabricated confidence;
- architecture bypass;
- page ownership conflict.

## Review Checklist

Before a case study is accepted, verify:

- [ ] Product identity is described without marketing exaggeration.
- [ ] Target users are identified.
- [ ] Core workflows are mapped.
- [ ] Homepage or entry hierarchy is documented.
- [ ] Navigation model is documented.
- [ ] Progressive disclosure is evaluated.
- [ ] Information density is evaluated.
- [ ] Visualization types are reviewed.
- [ ] UX responsiveness and feedback are reviewed.
- [ ] Decision-support path is explained.
- [ ] Evidence presentation is evaluated.
- [ ] Confidence or uncertainty semantics are reviewed.
- [ ] Historical comparison is reviewed.
- [ ] Strengths are concrete.
- [ ] Weaknesses are concrete.
- [ ] Transferable patterns are separated from non-transferable patterns.
- [ ] Scores include written justification.
- [ ] Unavailable information is marked `UNAVAILABLE`.
- [ ] No internal implementation is inferred without evidence.
- [ ] QuantTerminal implications are tied to master product principles.

## Pattern Extraction Guide

A pattern is transferable only when it can be separated from the competitor's
surface identity.

| Observed item | Not enough | Transferable pattern |
| --- | --- | --- |
| Dense Bloomberg screens | "Make it dense" | Expert workflows benefit from stable high-density layouts with keyboard/search acceleration. |
| TradingView chart tools | "Copy chart toolbar" | Users need direct manipulation and fast visual experimentation around charts. |
| DefiLlama protocol pages | "Copy protocol table" | Crypto users benefit from protocol-first grouping with clear category pivots. |
| Arkham entity graphs | "Copy graph view" | Investigation workflows need relationship maps when entity links matter. |
| Glassnode research charts | "Copy metric library" | Complex data needs explanatory chart context and consistent metric definitions. |

## QuantTerminal Fit Test

Every transferable pattern must pass:

```text
Does it improve user understanding?
Does it preserve Evidence First?
Does it preserve Visual First?
Does it preserve human decision authority?
Can it expose source, freshness, and availability?
Does it fit an existing page responsibility?
Does it avoid fabricated confidence?
Does it remain responsive?
```

If the answer is no, the pattern should be rejected or reframed.

## Output Standard

Every completed case study should produce:

- one markdown case study;
- a score table;
- a strengths list;
- a weaknesses list;
- transferable patterns;
- non-transferable patterns;
- QuantTerminal implications;
- follow-up questions;
- explicit limitations.

Case studies should inform Product Diagram Pack, UI redesign, Evidence Card
evolution, navigation strategy, and future product construction. They do not
directly approve implementation.
