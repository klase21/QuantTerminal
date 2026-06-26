# Markets V2 Certification

Status: Project Beta Sprint M4  
Scope: visual certification and freeze readiness  
Reviewed implementation: `components/markets/MarketsPage.tsx`

## Certification Summary

Markets V2 is structurally aligned with the Sprint M1 Markets foundation and the Sprint M3 hierarchy implementation.

Approved hierarchy remains:

```text
Market Context
-> Ranked Opportunities
-> Market Breadth
-> Sector Rotation
-> Exchange Overview
-> ETF / Capital Flow
-> Market Movers
-> Supporting Analytics
```

The current page has moved from a single-symbol structure inspector into an opportunity-discovery workflow while preserving the existing selected-symbol analytics below the first-read layer.

## Design System Compliance

### Typography

Status: PASS

Markets uses compact uppercase terminal typography consistent with the Dashboard Design System:

- section titles use compact, high-weight, high-tracking labels;
- ranked opportunity rows use obvious rank markers;
- metadata remains smaller than primary values;
- supporting analytics avoid hero-scale typography.

No typography redesign was performed in Sprint M4.

### Spacing

Status: PASS

The page uses dense section and card spacing consistent with the token registry:

- major sections use compact gaps;
- rows remain scan-friendly;
- supporting analytics are grouped below discovery sections;
- no marketing-style spacing or oversized whitespace was introduced.

No spacing changes were performed in Sprint M4.

### Surfaces

Status: PASS

Surface priority is aligned:

- Market Context uses the strongest Markets surface without becoming a Dashboard-style conclusion hero.
- Ranked Opportunities is a primary discovery surface.
- Breadth, Sector Rotation, Exchange Overview, ETF / Capital Flow, and Market Movers use secondary discovery/support surfaces.
- Supporting Analytics uses the quietest analytics surface.

### Borders

Status: PASS

Borders remain 1px terminal-style boundaries with subdued intensity. Amber and cyan accents support hierarchy and metadata without creating a generic SaaS look.

### Badges

Status: PASS WITH MINOR FIX

Badges use explicit text labels and color. Sprint M4 removed one objective issue:

- `Supporting Analytics` previously displayed an unconditional `CURRENT` badge.
- That badge was not backed by a single aggregate health source and could be interpreted as fabricated health.
- The badge was removed instead of replaced with another unsupported state.

Remaining section badges are tied to existing response state or source health.

### Colors

Status: PASS

Markets preserves QuantTerminal identity:

- dark green-black canvas;
- amber structural accents;
- cyan metadata accents;
- green/red/amber used for positive, negative, neutral, stale, or partial states;
- no pastel or generic SaaS palette.

### Section Hierarchy

Status: PASS

The approved hierarchy is intact. Supporting Analytics remains below all discovery and capital-flow sections.

## Remaining Objective Issues

1. Capital flow coverage is narrow.
   - Evidence: Markets currently consumes ETF flow and Reserve Intelligence, but not Treasury, Exchange Flow, or Reserve Delta directly.
   - Impact: ETF / Capital Flow is valid but incomplete.
   - Recommendation: defer until a scoped post-freeze capital-flow integration sprint.

2. Market Context filter controls are not interactive yet.
   - Evidence: universe, exchange, and focus are displayed as state, not editable controls.
   - Impact: users can see context but cannot fully manipulate it from this page.
   - Recommendation: defer until a dedicated Markets filter sprint.

3. Ranked Opportunities depends on `/api/market/movers` availability.
   - Evidence: unavailable state is shown if the movers scan fails.
   - Impact: page degrades safely but loses its primary discovery answer when the source is unavailable.
   - Recommendation: keep as accepted limitation; do not invent fallback rankings.

4. Supporting Analytics contains dense table-like sections.
   - Evidence: orderbook, trade flow, and liquidation rows remain from Markets V1.
   - Impact: appropriate below the first-read layer, but should remain visually secondary.
   - Recommendation: no action before freeze unless responsive clipping is observed.

## Known Limitations

- No new intelligence was introduced.
- No new APIs were introduced.
- No new ranking formula was introduced.
- No Dashboard, Scanner, Replay, Research, or Trade code was modified.
- Markets does not yet provide full interactive filtering.
- Markets does not yet expose all available deployable capital-flow artifacts.
- Markets should not claim unavailable evidence as current.

## Freeze Recommendation

Recommendation: FREEZE CANDIDATE

Markets V2 is acceptable as a freeze candidate because:

- hierarchy matches the approved Markets V2 foundation;
- opportunities appear before analytics;
- selected-symbol analytics are preserved but no longer lead the page;
- visual language is consistent with Dashboard Design System principles;
- unavailable states remain explicit;
- no synthetic data was introduced;
- objective Sprint M4 badge issue was fixed.

Freeze condition:

Markets may freeze after validation passes:

- TypeScript;
- Dashboard integration audit;
- Intelligence smoke test.

Post-freeze work should require a documented sprint and should not be bundled into certification.
