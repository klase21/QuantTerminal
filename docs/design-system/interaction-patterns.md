# Interaction Patterns

**Owner:** Product Design  
**Status:** Canonical

## General Rules

Interactions are predictable, reversible where practical, and explicit about
scope. They preserve active symbol, time, evidence, filters, and workspace
context when that context remains relevant and source-backed.

## Canonical Patterns

| Pattern | Contract |
| --- | --- |
| Hover | Reveals affordance or concise metadata; never hides required content |
| Click | Performs one clear action and gives immediate feedback |
| Expand | Reveals deeper information in place while preserving summary context |
| Collapse | Reduces detail without losing state or critical warnings |
| Search | Finds supported entities and distinguishes unavailable or unsupported results |
| Filtering | Refines visible content; active filters and their effects remain visible |
| Sorting | Changes order, not meaning; current basis and direction are explicit |
| Pinning | Preserves a source-backed reference or user preference, not a copied fact |
| Cross Navigation | Moves to the next ownership domain while carrying safe context |
| Workspace Sync | Aligns panels on explicit dimensions and visibly identifies sync state |
| Context Preservation | Retains relevant symbol, exchange, timeframe, date, evidence, or thesis |

## Feedback

Every action produces a visible state change, acknowledgment, or error. Long
operations communicate progress and remain cancelable when cancellation is
safe. Optimistic presentation must not imply a Repository fact was persisted
before confirmation.

## Search and Filtering

Search complements stable navigation. Results identify entity type, source
state, and context. Filters never conceal critical warnings without showing
that the view is filtered. Reset behavior is predictable.

## Cross-Navigation

Canonical handoffs include Dashboard to Markets, Scanner to Trade, Dashboard or
Trade to Replay, Replay to Research, and Research to Trade. A return path leads
back to the source context. Unsafe or irrelevant context is dropped explicitly.

## Destructive and Consequential Actions

Consequential actions state scope and outcome before confirmation. Destructive
actions use clear language, visual distinction, and confirmation proportional
to reversibility. Human decision authority remains explicit.

## Loading and Heavy Evidence

Primary workflows remain responsive while optional or heavy evidence loads.
Failure of an optional dataset produces a local unavailable state, not a blocked
screen. Exact scans and expensive reconstruction do not belong in interactive
request paths.

