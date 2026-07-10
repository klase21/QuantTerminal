# Navigation Map

**Status:** Canonical navigation architecture  
**Owner:** Product / Design  
**Scope:** Navigation structure only. No UI design.  

## Purpose

Navigation defines how users move through QuantTerminal without losing context
or confusing page ownership.

## Primary Navigation

```text
Dashboard
Markets
Scanner
Trade
Research
Replay
Settings / Operations
```

| Destination | Owns |
| --- | --- |
| Dashboard | 5-second market understanding. |
| Markets | Live monitoring and verification. |
| Scanner | Opportunity discovery. |
| Trade | Candidate evaluation and execution support. |
| Research | Deep understanding and counter-evidence. |
| Replay | Historical movement explanation. |
| Settings / Operations | Configuration, source state, and operational controls. |

## Secondary Navigation

Secondary navigation may include:

- symbol context;
- evidence category;
- timeframe;
- date/hour;
- saved views;
- workspace;
- source status;
- user preferences.

Secondary navigation must never create new hidden page ownership.

## Context Switching

Context switching preserves:

- symbol;
- exchange;
- timeframe;
- date/hour;
- selected candidate;
- selected evidence card;
- selected replay window;
- selected thesis.

If context cannot be preserved safely, the destination must show why.

## Workspace

Workspace owns saved context:

- watchlists;
- layouts;
- evidence groups;
- replay windows;
- research trails;
- preferred density.

Workspace does not own facts or change evidence truth.

## Saved Views

Saved views may preserve layout and filters. They must not preserve stale
claims as if they are current.

## Search Entry

Search should be available from the global shell and should route to:

- symbols;
- markets;
- opportunities;
- replay windows;
- research documents;
- evidence;
- datasets;
- future entities.

Search results must show availability state where relevant.

## Navigation Validation

Navigation aligns with:

- Search-First Navigation;
- Context Preservation;
- Composable Intelligence;
- page ownership;
- no hidden actions.
