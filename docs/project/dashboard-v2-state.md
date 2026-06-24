# Dashboard V2 State

## Purpose

This document records the approved Dashboard V2 state after Sprint 69.

Future Dashboard work must preserve this state unless a sprint explicitly changes the Dashboard constitution. The goal is to prevent visual polish from drifting into hierarchy, terminology, data, or behavior changes.

## Current Approved Dashboard V2 Hierarchy

Dashboard V2 follows this order:

1. Market Direction
2. Top Drivers
3. Evidence Preview
4. Historical Analog
5. Prediction Markets
6. Tactical Alerts
7. Supporting Analytics

This hierarchy is intentional. Market Direction, Top Drivers, Evidence Preview, and Historical Analog form the first-read layer. Prediction Markets and Tactical Alerts are secondary decision support. Supporting Analytics are lower-priority context.

## Approved Hero Structure

The Market Direction hero is approved with this structure:

- Direction is primary.
- Confidence, Driver Count, and Data Health are balanced metadata cards.
- No single metadata card may dominate the hero right side.
- Approved labels are:
  - Confidence
  - Driver Count
  - Data Health
- Do not rename approved terms during polish.
- Do not introduce new terminology such as Conviction, Driver Metadata, or similar replacements unless a future sprint explicitly changes the constitution.

The hero should answer:

1. What is happening?
2. Why is it happening?
3. How reliable is the current read?

## Dashboard Constitution

Dashboard V2 follows:

Conclusion -> Reasons -> Evidence -> Analytics

Rules:

- Outcome first.
- Reasons before analytics.
- Evidence before opinion.
- Metadata is secondary.
- Real data only.
- No synthetic data.
- No score invention during polish.
- No terminology invention during polish.
- No historical-heavy workflow restoration.
- No request-time historical computation.

Dashboard is a fast market summary surface, not a research workspace and not a raw analytics terminal.

## Approved Sprint State

### Sprint 62: Hierarchy

Approved.

Dashboard was reorganized around the visual hierarchy:

1. Market Direction
2. Top Drivers
3. Evidence Preview
4. Historical Analog
5. Prediction Markets
6. Tactical Alerts
7. Supporting Analytics

This hierarchy remains the approved Dashboard V2 baseline.

### Sprint 63: Hero Base Visual Pass

Approved.

The Market Direction hero became visually dominant while preserving existing data, calculations, and behavior.

### Sprint 64: Visual Token Foundation

Approved.

Dashboard cards were normalized into visual levels:

- Level 1: Market Direction Hero
- Level 2: Top Drivers, Historical Analog, Prediction Markets, Tactical Alerts
- Level 3 and lower: Supporting Analytics

Card spacing, headers, borders, and state treatments were standardized.

### Sprint 65: Evidence Cards

Approved.

Evidence Preview became an evidence layer rather than a flat grid. Verified/current evidence is visually stronger than partial, stale, missing, or unavailable evidence.

### Sprint 66: Top Drivers

Approved.

Top Drivers became scannable within three seconds:

- exactly three visible drivers
- obvious rank
- clear category
- readable impact score
- direction-aware visual treatment
- preserved existing ordering and scoring

### Sprint 67: Historical Strip

Approved.

Historical Analog became a compact context strip, not a heavy analytics panel. It remains below Evidence Preview and above secondary decision support.

### Sprint 68: Prediction/Tactical Secondary Treatment

Approved.

Prediction Markets and Tactical Alerts became secondary decision support:

- Prediction Markets answers: What is the market pricing?
- Tactical Alerts answers: What should I watch next?

Both remain lower priority than Market Direction, Top Drivers, Evidence Preview, and Historical Analog.

### Sprint 69: Analytics De-emphasis

Approved.

Lower supporting analytics were de-emphasized and made visually secondary:

- Signal Evidence
- Execution Guidance
- ETF Flow
- Liquidity Conditions
- Narrative Heatmap
- Information Flow
- Trend Change Risk
- System Status

This is the current approved Dashboard V2 state.

### Sprint 70: Rejected and Reverted

Rejected.

Sprint 70 attempted a Hero Polish pass that changed the right-side metadata rhythm:

- Confidence became a larger Conviction card.
- Driver Count became Driver Metadata.
- Data Health became a smaller supporting row.

This was rejected because it broke the approved hero metadata balance and introduced terminology polish instead of design-constitution-aligned improvement.

The approved state restores:

- Confidence
- Driver Count
- Data Health

as balanced metadata cards.

## Future Work Rules

### Allowed in Polish

Future Dashboard polish may adjust:

- spacing
- typography
- colors
- borders
- density
- responsive presentation
- visual clarity within an existing section

These changes must remain local to the sprint's declared section.

### Forbidden in Polish

Future Dashboard polish must not change:

- hierarchy
- card balance
- approved terminology
- data logic
- router logic
- search params
- fetch hooks
- `useEffect` dependencies
- scoring
- calculations
- API contracts
- request behavior
- section ownership

Polish must not create new data states, invent scores, rename approved labels, or change what the user sees as the primary conclusion.

## Review Gate

Every future Dashboard sprint must state:

1. What section it touches.
2. Which approved Dashboard rule it follows.
3. What it is not allowed to change.

Review should reject any Dashboard sprint that:

- changes hierarchy without explicit approval
- changes approved labels without explicit approval
- changes fetch or routing behavior during visual polish
- makes secondary sections compete with the first-read layer
- makes metadata dominate the conclusion
- introduces synthetic data or invented scores

## Validation Checklist

For Dashboard polish:

- Runtime files outside the scoped section are untouched.
- Data, APIs, router, URL params, fetch hooks, `useEffect`, scoring, and calculations are unchanged.
- Market Direction remains the first visual conclusion.
- Top Drivers remain the first reasoning layer.
- Evidence Preview remains the first evidence layer.
- Historical Analog remains a lightweight context strip.
- Prediction Markets and Tactical Alerts remain secondary.
- Supporting Analytics remain lower priority.
- Sprint 70 terminology changes remain rejected.
