# Dashboard Design System

Status: Dashboard V2 visual token specification  
Scope: Dashboard only  
Primary state reference: `docs/project/dashboard-v2-state.md`

## 1. Purpose

This document defines visual tokens and review rules for Dashboard V2.

Its purpose is to prevent ad-hoc polish drift. Future implementation work should use this file to align the Vercel implementation with the approved Figma/Make React visual language while preserving the approved Dashboard V2 state.

This document does not change runtime behavior. It defines how Dashboard visuals should be expressed.

Dashboard design work must still comply with:

- `docs/project/dashboard-v2-state.md`
- `docs/project/DESIGN.md`
- `docs/project/DASHBOARD_VISUAL_MOCKUP_V1.md`
- `docs/project/DASHBOARD_MOCKUP_V2.md`
- `docs/project/MAKE_ANALYSIS.md`

## 2. Visual Identity

Dashboard V2 is an intelligence terminal, not a generic SaaS dashboard.

The visual identity combines:

- QuantTerminal terminal identity.
- Bloomberg density below the first-read layer.
- Valley clarity above the fold.
- GMGN actionability through ranked drivers.
- Dark green-black surfaces.
- Amber structural accents.
- Cyan informational metadata.
- Monospace typography.
- Compact professional density.

The Dashboard must not become:

- pastel;
- card-heavy in a generic SaaS style;
- marketing-like;
- chart-first;
- analytics-first;
- visually detached from the terminal aesthetic.

The first visual read is:

```text
Conclusion
  -> Reasons
  -> Evidence
  -> Analytics
```

## 3. Typography System

Typography is monospace throughout. Space Mono is the preferred visual reference. IBM Plex Mono or the existing terminal monospace stack may be used for dense metadata.

### Hero Direction Text

Role: primary conclusion.

- Desktop: 72px target, 56-96px allowable range depending viewport.
- Tablet: 44-56px.
- Mobile: 32-40px.
- Weight: black / 800-900.
- Transform: uppercase.
- Line height: tight, approximately 0.86-0.95.
- Letter spacing: slightly positive only; do not use negative tracking.

### Section Title

Role: section identity.

- Size: 10-12px.
- Weight: black.
- Transform: uppercase.
- Tracking: wide, approximately 0.16em-0.20em.
- Color: cyan or muted amber depending hierarchy.
- Line height: compact.

### Card Title

Role: item identity inside a section.

- Size: 14-17px for driver/evidence titles.
- Size: 10-13px for secondary analytics.
- Weight: black.
- Transform: uppercase when the content is a label or driver title.
- Avoid paragraph-style card titles.

### Metadata Label

Role: source, freshness, generated time, category, auxiliary context.

- Size: 8-10px.
- Weight: black.
- Transform: uppercase.
- Tracking: 0.10em-0.14em.
- Color: muted text.
- Metadata must never visually dominate a conclusion or driver.

### Body Text

Role: one-line evidence or explanation.

- Size: 10-12px.
- Weight: bold/black in terminal panels.
- Line height: 1.35-1.55.
- Use one to two lines.
- Avoid long paragraphs in Dashboard.

### Numeric Value

Role: confidence, impact score, cases, averages, win rate, flow values.

- Hero-level numbers: 32-56px.
- Driver impact: 28-40px.
- Evidence values: 14-18px.
- Analytics values: 14-20px.
- Use tabular visual rhythm where possible.
- Do not invent precision.

### Badge Text

Role: state, quality, category, rank metadata.

- Size: 8-10px.
- Weight: black.
- Transform: uppercase.
- Tracking: 0.10em-0.14em.
- Must be text-visible; color alone is insufficient.

## 4. Color Tokens

Use token roles, not random colors. Tailwind classes may implement these roles, but the role must be clear.

| Token | Role |
| --- | --- |
| `background.base` | Page canvas. Dark green-black terminal surface. |
| `surface.level1` | Market Direction hero surface. Highest contrast, richest depth. |
| `surface.level2` | Primary cards: Top Drivers and Evidence Preview. Strong but below hero. |
| `surface.level3` | Secondary support: Prediction Markets and Tactical Alerts. Quieter than first-read layer. |
| `surface.level4` | Supporting analytics. Lowest contrast dense panels. |
| `border.subtle` | Default quiet panel border. |
| `border.strong` | Hero, important evidence, or active section border. |
| `accent.amber` | Structural rails, rank, conclusion framing, historical strip accent. |
| `accent.cyan` | Metadata, category labels, informational accents. |
| `state.positive` | Positive direction or constructive evidence. Green. |
| `state.negative` | Negative direction or adverse evidence. Rose/red. |
| `state.neutral` | Mixed or uncertain evidence. Amber/yellow. |
| `state.missing` | Missing, unavailable, stale, or muted evidence. Zinc/gray. |
| `text.primary` | Main readable text. |
| `text.secondary` | Supporting text. |
| `text.muted` | Metadata and low-emphasis context. |

Reference palette from Make analysis:

- `background.base`: `#070d07`
- `surface.level2`: `#0c140c`
- `surface.level3`: `#111911`
- `surface.level4`: `#0a0f0a`
- `border.subtle`: `#1c2c1c`
- `accent.amber`: `#f97316`
- `accent.cyan`: `#38bdf8`
- `state.positive`: `#22c55e`
- `state.negative`: `#e53535`
- `state.neutral`: `#facc15`
- `text.primary`: `#d4dbd4`
- `text.secondary`: `#a0b0a0`
- `text.muted`: `#6b7d6b`

## 5. Surface Levels

### Level 1 Hero

Use for Market Direction only.

Role:

- conclusion;
- first eye landing;
- highest contrast;
- largest type;
- strongest depth.

Rules:

- Direction dominates.
- Metadata is secondary.
- Confidence, Driver Count, and Data Health must remain balanced.
- No single metadata card may dominate the hero right side.

### Level 2 Primary Cards

Use for the first-read reasoning and evidence layer.

Examples:

- Top Drivers
- Evidence Preview
- Historical Analog strip treatment may use a specialized lower Level 2 strip

Rules:

- Stronger than secondary support.
- Lower visual weight than Hero.
- Supports fast comprehension.
- Should not contain dense raw analytics.

### Level 3 Secondary Support Cards

Use for secondary decision support.

Examples:

- Prediction Markets
- Tactical Alerts

Rules:

- Useful, readable, compact.
- Does not compete with Top Drivers or Evidence Preview.
- Uses smaller type and lower contrast than Level 2.

### Level 4 Analytics Cards

Use for supporting analytics and operational context.

Examples:

- Signal Evidence
- Execution Guidance
- ETF Flow detail
- Liquidity Conditions
- Narrative Heatmap
- Information Flow
- Trend Change Risk
- System Status

Rules:

- Dense is acceptable.
- Visual contrast is lowest.
- No hero-scale values.
- Missing/unavailable states remain compact.

## 6. Card System

### Padding

- Hero internal padding: 20-32px desktop, 16-20px tablet, 12-16px mobile.
- Primary card padding: 12px.
- Secondary card padding: 10-12px.
- Analytics card padding: 10-12px.
- Compact rows: 6-8px vertical padding.

### Border Behavior

- Use 1px borders.
- Hero may use stronger border and subtle glow/depth.
- Primary cards use visible but not loud borders.
- Secondary and analytics cards use subdued borders.
- Missing/unavailable cards should have lower contrast borders.

### Radius

- Use small terminal radius.
- Target: 4-8px.
- Avoid pill-heavy SaaS cards except for badges.
- Avoid large rounded marketing panels.

### Header Layout

Card headers should use:

- left icon when useful;
- uppercase section title;
- optional right metadata;
- consistent bottom spacing;
- subtle divider only when it improves scanability.

Headers must not become louder than content.

### Metadata Placement

- Hero metadata belongs in balanced right-side cards.
- Evidence metadata belongs at card bottom or top-right badge.
- Historical metadata belongs at the right edge of the strip.
- Analytics metadata can be inline or footer-style.

### Density Rule

Density increases as priority decreases:

```text
Hero: spacious
Drivers: compact and ranked
Evidence: compact proof
Prediction/Tactical: compact support
Analytics: dense validation
```

### Hero Metadata Balance

Approved hero metadata cards are:

- Confidence
- Driver Count
- Data Health

No future polish may:

- rename these terms;
- enlarge one metadata card so it dominates;
- collapse metadata into an uneven hierarchy;
- replace the three-card rhythm without an explicit constitution change.

## 7. Badge System

Badges must use text plus color. Color alone is not enough.

### CURRENT / VERIFIED

Role: valid evidence inside freshness policy.

Treatment:

- green/emerald tint;
- clear text label;
- medium contrast border;
- should feel reliable but not decorative.

### PARTIAL / DEGRADED

Role: usable but incomplete evidence.

Treatment:

- amber tint;
- explicit text label;
- should be visibly weaker than verified/current.

### STALE

Role: evidence exists but is outside freshness policy.

Treatment:

- orange/amber warning tint;
- explicit text label;
- do not style as current.

### MISSING / UNAVAILABLE

Role: evidence absent or unusable.

Treatment:

- muted gray/zinc surface;
- explicit text label;
- compact reason when trust is affected;
- should not look identical to valid evidence.

### LOADING

Role: active request.

Treatment:

- cyan or muted informational tint;
- explicit `LOADING`;
- no `NO DATA` until request completes.

## 8. Spacing System

### Section Gap

- Desktop: 12px default.
- Tablet: 10-12px.
- Mobile: 8-10px.

### Card Gap

- Hero internal grid: 12px.
- Drivers: 8px.
- Evidence cards: 8px.
- Secondary support: 6-8px.
- Analytics: 8-12px depending density.

### Inner Padding

- Primary surfaces: 12px.
- Compact rows: 6-8px.
- Badges: 2-4px vertical, 6-8px horizontal.

### Compact Row Spacing

- Row height should be stable.
- Text must not wrap unpredictably in dense tables.
- Use truncation for metadata.
- Do not hide critical state labels.

### Mobile Spacing Rules

- Preserve order before optimizing density.
- Direction appears before drivers.
- Drivers appear before evidence.
- Evidence appears before analytics.
- Avoid horizontal scrolling except for explicitly tabular deep analytics.

## 9. Grid Rules

### Desktop

Reference:

- 12-column grid.
- 8px gutters.
- 12px outer spacing.
- Full-width first-read stack.

Approved order:

1. Market Direction
2. Top Drivers
3. Evidence Preview
4. Historical Analog
5. Prediction Markets
6. Tactical Alerts
7. Supporting Analytics

### Tablet

Rules:

- Hero remains full width.
- Drivers use two columns or stack cleanly.
- Evidence uses two columns.
- Historical strip stays compact.
- Secondary support and analytics stack below.

### Mobile

Rules:

- First viewport must show conclusion before analytics.
- Direction stays first.
- Top three drivers remain visible before deep evidence.
- Evidence may start below the first viewport.
- Analytics should be collapsed or visually secondary.

### Above-The-Fold Rule

The first-read layer must stay visible early:

- Market Direction
- Top Drivers
- Evidence Preview
- Historical Analog

Prediction Markets, Tactical Alerts, and Supporting Analytics must not displace the first-read layer.

## 10. Forbidden Drift

Future Dashboard polish may not:

- invent terminology;
- rename approved labels;
- change hierarchy;
- change card balance;
- replace terminal identity;
- introduce random colors;
- use generic SaaS or pastel styling;
- make secondary cards compete with the Hero;
- move analytics above Drivers or Evidence;
- hide evidence freshness;
- remove state labels;
- introduce synthetic values;
- alter fetch, router, scoring, or data logic during visual work.

Specifically forbidden unless explicitly approved:

- replacing `Confidence` with `Conviction`;
- replacing `Driver Count` with `Driver Metadata`;
- making one hero metadata card dominate the others;
- restoring a heavy Historical Analog panel;
- making Prediction Markets or Tactical Alerts primary content.

## 11. Implementation Guidance

Future implementation sprints should apply tokens carefully.

Rules:

1. Touch one token category or one section per sprint.
2. Do not combine visual work with data/API/router changes.
3. Do not change section hierarchy.
4. Compare against Figma/mockup intent before implementation.
5. Compare against Figma/mockup intent after implementation.
6. Check `docs/project/dashboard-v2-state.md` before changing Dashboard.
7. Preserve approved terminology.
8. Preserve responsive order.
9. Keep missing/unavailable states explicit.
10. Prefer small visual patches over broad rewrites.

Examples of safe token sprints:

- border opacity pass;
- section header pass;
- badge consistency pass;
- mobile spacing pass;
- typography scale pass;
- analytics density pass.

Examples of unsafe polish:

- changing Dashboard route state;
- changing API requests;
- changing driver sorting;
- renaming approved labels;
- changing the first-read order;
- moving analytics above Evidence.

## 12. Review Checklist

Before merging any Dashboard visual polish, verify:

- Dashboard state compliance:
  - order matches `dashboard-v2-state.md`;
  - Sprint 70 rejection remains respected;
  - approved labels remain intact.
- Design token compliance:
  - surfaces use Level 1-4 roles;
  - colors map to named token roles;
  - badges use approved state treatments;
  - typography follows role scale.
- Figma/mockup alignment:
  - Dashboard reads as terminal-first;
  - conclusion is first;
  - drivers are ranked;
  - evidence is compact;
  - analytics are secondary.
- No runtime behavior changes:
  - no fetch hook changes;
  - no `useEffect` dependency changes;
  - no router/search param changes;
  - no API changes;
  - no scoring/calculation changes;
  - no synthetic data.
- Screenshot review:
  - desktop first-read layer visible;
  - tablet hierarchy preserved;
  - mobile starts with conclusion and drivers;
  - no section visually feels like a different product.

If a visual change fails the checklist, it should be rejected or split into a narrower sprint.
