# QuantTerminal Design DNA

**Status:** Canonical product identity document  
**Owner:** Product / Design  
**Related documents:** `MASTER_PRODUCT.md`, `MASTER_PLAN.md`, `MASTER_ARCHITECTURE.md`  

## Purpose

Design DNA defines the enduring identity of QuantTerminal's product
experience. It explains how the product should feel, behave, and communicate
across Dashboard, Markets, Scanner, Trade, Replay, Research, Evidence Cards,
and future experiences.

## Principles

| Principle | Purpose | Why It Exists | Product Decision Influence |
| --- | --- | --- | --- |
| Visual First | Let users understand state before reading long explanations. | Markets are easier to scan through structure, charts, timelines, and cards. | Choose charts, evidence cards, timelines, and hierarchy before prose-heavy layouts. |
| Evidence First | Make every insight traceable. | Trust depends on source-backed facts, availability, freshness, and limitations. | Claims require nearby evidence; unsupported claims become unavailable. |
| Explain, Don't Predict | Keep interpretation bounded and honest. | QuantTerminal is not a signal-selling or prediction-only platform. | Product copy explains observed conditions, not guaranteed outcomes. |
| 5-Second Rule | Preserve fast orientation. | Users should understand the primary screen state quickly. | Every screen needs one primary message and clear next step. |
| Progressive Disclosure | Support beginners and professionals in the same product. | Different users need different depth at different moments. | Start with headline/evidence, then reveal charts, replay, research, and raw records. |
| Decision Support | Help users think better without replacing judgment. | The product exists to support decisions, not automate belief. | Show evidence, contradiction, context, and risk before action. |
| Human Authority | Keep the user as final decision maker. | AI, alerts, and automation can assist but must not own judgment. | Avoid coercive copy, forced actions, and black-box recommendations. |
| Trust Before Attention | Prefer credibility over engagement. | Hype creates short-term attention and long-term distrust. | Avoid sensational language, fake urgency, and unexplained scores. |
| Professional Workflow | Support repeatable high-density workflows. | Serious users need stable layouts, search, filters, and saved context. | Design for scanning, keyboard/search acceleration, and persistent context. |
| Composable Intelligence | Let modules hand off context without merging ownership. | Dashboard, Replay, Research, Scanner, Markets, and Trade answer different questions. | Preserve page ownership while enabling cross-navigation. |
| Consistency | Make the product learnable and trustworthy. | Repeated states and patterns reduce cognitive load. | Reuse labels, cards, state language, colors, and interactions. |
| Information Transparency | Show what is known, unknown, stale, partial, experimental, or unavailable. | Missing evidence is safer than fabricated evidence. | Every uncertain state must be visible and named. |

## Design Identity

QuantTerminal should feel:

- serious, not theatrical;
- dense, not cluttered;
- visual, not decorative;
- intelligent, not overconfident;
- professional, not cold;
- responsive, not exhaustive;
- transparent, not mysterious;
- composable, not fragmented.

## Design Voice

Product language should be:

- specific;
- source-aware;
- calm;
- concise;
- explicit about uncertainty;
- free of hype;
- free of unsupported certainty.

## Design Decision Filter

Every design choice should pass:

```text
Does this make evidence easier to understand?
Does this make the primary decision clearer?
Does this preserve source transparency?
Does this reduce cognitive load?
Does this preserve page ownership?
Does this remain responsive?
Does this avoid fabricated confidence?
```

If the answer is no, the design should be revised.
