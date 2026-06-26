# Scanner Wireframe

Status: textual wireframe V1  
Scope: Scanner V2 structure only  
Runtime impact: none

This is not a visual mockup. It defines placement, hierarchy, and intent only.

## 1. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ SCANNER HEADER                                                              │
│ Universe: Futures / Spot / Watchlist     Health: CURRENT     Freshness      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ PRIORITY OPPORTUNITIES                                                      │
│ "What deserves attention right now?"                                        │
│                                                                              │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │ #1 SIGNAL            │ │ #2 SIGNAL            │ │ #3 SIGNAL            │ │
│ │ Symbol / Category    │ │ Symbol / Category    │ │ Symbol / Category    │ │
│ │ Why notable          │ │ Why notable          │ │ Why notable          │ │
│ │ Evidence: VERIFIED   │ │ Evidence: PARTIAL    │ │ Evidence: STALE      │ │
│ │ Open: Markets        │ │ Open: Research       │ │ Open: Markets        │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐ ┌─────────────────────────────┐
│ SIGNAL FEED                                  │ │ OPPORTUNITY FILTERS         │
│ Recent notable changes                       │ │ Signal Type                 │
│                                              │ │ Symbol Universe             │
│ Row: Symbol / Signal / State / Action        │ │ Exchange                    │
│ Row: Symbol / Signal / State / Action        │ │ Evidence Quality            │
│ Row: Symbol / Signal / State / Action        │ │ Freshness                   │
└──────────────────────────────────────────────┘ └─────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WATCHLIST CANDIDATES                                                        │
│ Candidate / Reason to monitor / Evidence state / Next action                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ SUPPORTING CONTEXT                                                          │
│ Breadth snapshot / source health / category context / unavailable states     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION ACTIONS                                                          │
│ Open in Markets | Open in Research | Open in Replay | Open in Trade          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 2. Tablet Wireframe

```text
SCANNER HEADER
Universe / Health / Freshness

PRIORITY OPPORTUNITIES
┌────────────────────────────┐
│ #1 Signal                  │
└────────────────────────────┘
┌────────────────────────────┐ ┌────────────────────────────┐
│ #2 Signal                  │ │ #3 Signal                  │
└────────────────────────────┘ └────────────────────────────┘

OPPORTUNITY FILTERS
Compact horizontal or wrapped controls

SIGNAL FEED
Stacked signal rows

WATCHLIST CANDIDATES
Compact candidate rows

SUPPORTING CONTEXT
Two-column context cards when space allows

NAVIGATION ACTIONS
Markets / Research / Replay / Trade
```

Tablet rules:

- Priority Opportunities stay above the feed.
- Filters may wrap but must not displace top signals.
- Signal rows remain readable.
- Supporting Context stays below opportunity content.

## 3. Mobile Wireframe

```text
SCANNER HEADER
Health / Freshness

PRIORITY OPPORTUNITY
#1 Signal
Why notable
Evidence state
Primary action

MORE OPPORTUNITIES
#2 Signal
#3 Signal
Show more

FILTERS
Collapsed controls

SIGNAL FEED
Compact stacked rows

WATCHLIST
Collapsed or compact list

SUPPORTING CONTEXT
Compact health and source cards

NAVIGATION ACTIONS
Markets
Research
Replay
Trade
```

Mobile rules:

- The first viewport must show the top signal.
- Evidence state must remain visible.
- Filters should not appear before top opportunities.
- Supporting Context must not crowd out the first-read signal.
- No horizontal scrolling except for explicit dense tables in a future approved sprint.

## 4. Section Explanations

### Scanner Header

Shows scan scope and trust state. It helps the user know whether Scanner is current, partial, stale, missing, or unavailable.

### Priority Opportunities

The main decision area. It should show the top ranked signals and the compact reason each deserves attention.

### Signal Feed

The broader stream of changes. It supports discovery after the first-read opportunity.

### Opportunity Filters

Controls signal noise. Filters should help the user narrow attention without implying that missing evidence is valid.

### Watchlist Candidates

Signals that are worth monitoring but not necessarily the highest priority.

### Supporting Context

Compact context only. This area should not become Markets analytics or Research narrative.

### Navigation Actions

Explicit handoffs into the correct product surface:

- Markets for live structure validation;
- Research for deeper evidence and implication;
- Replay for historical validation;
- Trade for execution planning.

## 5. Boundary Rules

Scanner owns:

- opportunity prioritization;
- signal visibility;
- ranking;
- filtering.

Scanner does not own:

- Dashboard conclusions;
- Markets exploration;
- Research narratives;
- Replay validation;
- Trade execution.

## 6. Design System Alignment

Scanner should reuse the shared visual language:

- typography tokens for section titles, ranked cards, evidence text, metadata, and badges;
- color tokens for dark terminal surfaces, amber hierarchy, cyan metadata, and state colors;
- spacing tokens for dense rows, compact cards, and readable section gaps;
- surface tokens for priority, secondary, and supporting sections;
- badge tokens for CURRENT, VERIFIED, PARTIAL, DEGRADED, STALE, LOADING, MISSING, and UNAVAILABLE.

Scanner should not copy Dashboard's hero pattern or Markets' dense page layout. It should apply the same system to a distinct attention-triage workflow.

