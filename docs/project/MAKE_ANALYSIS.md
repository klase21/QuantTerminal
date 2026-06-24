# Figma Make Extraction Analysis

Source archive:
`//wsl$/Ubuntu/home/klase21/work/figma-make-extractor/make_extraction/output/output.zip`

Scope reviewed:

- `decoded-message.json`
- `design-tokens.json`
- `react_app/`
- `source_files/`

## 1. Product Vision

Figma Make was not trying to build the production QuantTerminal app directly.
It generated a design-system audit and redesign recommendation workspace for
QuantTerminal.

The product vision inside the Make output is:

- a terminal-style market intelligence interface;
- a Bloomberg-like dense professional dashboard;
- a reusable design system for panels, market rows, charts, sentiment, orderbook,
  and blockchain metrics;
- an audit tool that documents what exists, what is missing, and what should be
  redesigned first.

The decoded Figma message reinforces this intent. The responsive set description
states that the design should streamline design processes with a comprehensive
design system that organizes layouts, components, colors, and UX patterns for
collaboration.

The Make project therefore functions as a design reference, not a data or
runtime architecture reference.

## 2. Information Architecture

### Page Hierarchy

The generated app is a single-page documentation workspace with eight sections:

1. Overview
2. Layout
3. Colors
4. Typography
5. Components
6. UX Patterns
7. Missing States
8. Redesign Recommendations

This hierarchy moves from product identity to implementation details to
operational gaps.

### Navigation Hierarchy

Navigation is section-based:

- `Overview`
- `Layout`
- `Colors`
- `Typography`
- `Components`
- `UX Patterns`
- `Missing States`
- `Redesign Rec.`

The navigation is an audit/documentation navigation model, not the final product
navigation. The UX audit explicitly calls out the absence of product navigation
as a problem and recommends a collapsed icon rail for Dashboard, Charts, Alerts,
History, and Settings.

### Information Hierarchy

The Make hierarchy is:

```text
Product identity
  -> layout model
  -> visual tokens
  -> component inventory
  -> UX behavior
  -> missing states
  -> prioritized redesign actions
```

Within panels, the hierarchy is:

```text
Section number
  -> uppercase section label
  -> short subtitle
  -> dense panel content
  -> recommendation or state tag
```

This is useful for design review, but it is not yet aligned with
QuantTerminal's product hierarchy:

```text
Conclusion
  -> Reason
  -> Evidence
```

## 3. Component Taxonomy

### Custom Make Components

- `TAG`: compact status/category label with amber, green, red, blue, and gray
  variants.
- `SectionHeader`: numbered section header with label and optional subtitle.
- `PanelBox`: base dark panel container.
- `PanelTitle`: uppercase panel title with orange divider rail.
- `Divider`: horizontal section separator.
- `Pill`: color-token display row.
- `DataRow`: label/value/delta row for market tables.
- `OverviewSection`: product summary and audit scope.
- `LayoutSection`: grid schematic and layout analysis.
- `ColorsSection`: palette and semantic color rules.
- `TypographySection`: typeface, scale, and typography issues.
- `ComponentsSection`: component inventory.
- `UXPatternsSection`: behavior and interaction pattern audit.
- `MissingStatesSection`: missing loading, empty, stale, error, and responsive
  states.
- `RedesignSection`: prioritized redesign recommendations.

### Product Component Concepts

- Data Panel
- Market Row
- Sentiment Badge
- Sparkline / Mini-chart
- Order Book
- Blockchain Metric Tile
- Sentiment Swatches
- Price Chart

### Shadcn/Radix Component Set Included

The project includes a broad reusable UI library:

- accordion
- alert
- alert-dialog
- aspect-ratio
- avatar
- badge
- breadcrumb
- button
- calendar
- card
- carousel
- chart
- checkbox
- collapsible
- command
- context-menu
- dialog
- drawer
- dropdown-menu
- form
- hover-card
- input
- input-otp
- label
- menubar
- navigation-menu
- pagination
- popover
- progress
- radio-group
- resizable
- scroll-area
- select
- separator
- sheet
- sidebar
- skeleton
- slider
- sonner
- switch
- table
- tabs
- textarea
- toggle
- toggle-group
- tooltip
- ImageWithFallback
- use-mobile
- utils

Most of these are library scaffolding, not designed QuantTerminal-specific
components. The most valuable custom taxonomy is the smaller terminal panel
system above.

## 4. Design Tokens

### Colors

The Make palette is dark terminal-first.

Core surfaces:

- Canvas: `#070d07`
- Panel Surface: `#0c140c`
- Panel Raised: `#111911`
- Panel Active/Input: `#141e14`
- Panel Border: `#1c2c1c`

Semantic colors:

- Brand / Amber: `#f97316`
- Amber Dim: `#7c3d12`
- Positive / Long: `#22c55e`
- Negative / Short: `#e53535`
- Caution: `#facc15`
- Info / Chain: `#38bdf8`

Text:

- Primary: `#d4dbd4`
- Secondary: `#a0b0a0`
- Muted: `#6b7d6b`
- Dim: `#3d503d`

The token file also includes default shadcn light/dark tokens, but the
QuantTerminal-specific palette is defined through `--qt-*` variables.

### Typography

Primary typeface:

- Space Mono

Secondary typeface:

- IBM Plex Mono for blockchain hashes, transaction IDs, and raw hexadecimal
  values.

Observed scale:

- Panel header: 10px, 700 weight, wide tracking.
- Data value: 13px.
- Label/tick: 10px.
- Delta badge: 10px, 700 weight.
- Hash/ID: 9px.

Make identified the current scale as ad hoc and recommended a formal
9 / 10 / 11 / 13px type scale.

### Spacing

Observed spacing:

- Panel gap: about 2px.
- Internal padding: 8-12px.
- Header height: about 24px.
- Row height: about 18-20px.
- Border radius: near-zero, with token `--radius: 0.125rem`.

The design prioritizes density over comfort.

### Density

The Make output assumes professional-terminal density:

- every panel is compact;
- labels are tiny and uppercase;
- values are tabular;
- panels tile the viewport;
- most content is visible simultaneously.

This density is useful for expert workflows but increases onboarding cost and
accessibility risk.

## 5. UX Patterns

### Filtering

Filtering is identified as missing rather than implemented. The Make audit
specifically calls out market-list filtering without a visible active filter or
clear button.

Recommended pattern:

- active filter chip in the panel header;
- clear affordance;
- live filtering in Markets;
- visible empty state when filters return no rows.

### Ranking

Ranking is implied through:

- numbered sections;
- severity tags;
- priority groups;
- recommendation ordering.

The redesign section uses:

1. Foundation fixes
2. Interaction model
3. Responsive and accessibility

This is useful for QuantTerminal: ranking should be explicit, not left to panel
position alone.

### Prioritization

Make prioritizes foundational product reliability before interaction polish:

- type scale;
- loading and error states;
- data freshness;
- border/token consistency;
- colorblind delta affordances.

Only after those does it recommend:

- nav rail;
- drag/reorder;
- toasts;
- keyboard navigation;
- responsive behavior.

### Progressive Disclosure

Progressive disclosure is mostly absent in the generated product model.

The app recommends:

- focus mode;
- collapsible navigation;
- panel-specific states;
- responsive tabbed layouts.

For QuantTerminal, this means the terminal density should be preserved, but
secondary analytics should be collapsible or lower priority.

## 6. Hidden Design Assumptions

Make assumed:

- users are expert traders or analysts comfortable with dense terminal UIs;
- users understand green/red market semantics without secondary labels;
- users prefer simultaneous visibility over guided onboarding;
- desktop is the primary environment;
- real-time data is always present unless explicitly modeled otherwise;
- panel widgets are independent and can own their own state;
- navigation is less important than dashboard density;
- users can infer stale/live status unless the UI adds explicit freshness;
- order entry or trade action flows need confirmation but were not modeled;
- accessibility can be handled after the core terminal aesthetic is defined.

These assumptions are not all compatible with QuantTerminal's current direction
as an intelligence product. QuantTerminal needs first-read comprehension and
evidence trust, not only expert density.

## 7. Strengths

- Strong terminal identity.
- Clear dark-green/amber visual language.
- Compact panel system maps well to market intelligence.
- Useful component taxonomy for data panels, market rows, orderbook, charts,
  sentiment, and blockchain metrics.
- Explicit missing-state inventory.
- Good recognition that loading, stale, empty, and error states are product
  requirements.
- Prioritized redesign list is practical.
- Recommends data freshness indicators, which aligns with Data Health.
- Recommends secondary shape indicators for accessibility.
- Identifies responsiveness as a real weakness rather than hiding it.

## 8. Weaknesses

- The product model is still dashboard-first, not intelligence-first.
- It emphasizes widgets more than conclusions.
- It does not define a decision hierarchy.
- It lacks a true user journey.
- No production navigation model exists.
- Mobile and tablet behavior are described as broken.
- Filtering is only recommended, not designed.
- Ranking exists for recommendations, not market evidence.
- It assumes high information density is always valuable.
- It does not distinguish analytics from intelligence.
- It does not address source validity, freshness policy, or artifact health as
  first-class product concepts.
- It includes many generic shadcn primitives that are not useful as
  QuantTerminal product components unless curated.

## 9. Recommendations for QuantTerminal

1. Keep the visual identity: dark green-black surfaces, amber rails, monospace,
   sharp panels, tabular values.
2. Do not adopt the Make dashboard hierarchy wholesale. It is too widget-led.
3. Use the Make component taxonomy as a visual component library, not as product
   architecture.
4. Merge Make's freshness recommendations with QuantTerminal Data Health:
   every evidence card should expose current, stale, missing, or unavailable.
5. Keep panel density for Markets and Replay, but make Dashboard
   conclusion-first.
6. Adopt the missing-state matrix across all panels:
   empty, loading, stale, error, zero/flat, active filter, and responsive states.
7. Add shape or text indicators beside red/green deltas.
8. Use active filter chips for Markets, Scanner, Research, and Evidence views.
9. Avoid drag/reorder until product hierarchy is stable. User customization can
   amplify inconsistency if the base IA is weak.
10. Make focus mode a Research/Replay pattern, not a Dashboard default.
11. Convert terminal panels into typed components with explicit contracts:
   title, state, observedAt, source, reason, evidence, action.
12. Preserve density only where it improves decision speed.

## 10. Design Principles Extracted

### Preserve

- Terminal aesthetic.
- Monospace discipline.
- Dense evidence display.
- Orange section rails.
- Green/red semantic direction, with accessibility supplements.
- Independent panel contracts.
- Small reusable market widgets.

### Modify

- Move from widget mosaic to conclusion-first surfaces.
- Convert raw panels into evidence cards.
- Replace implicit freshness with explicit health.
- Replace color-only status with color plus shape/text.
- Replace fixed desktop grid with responsive priority stacking.
- Replace generic component sprawl with curated QuantTerminal primitives.

### Avoid

- Treating the Make app as production architecture.
- Copying the static dashboard grid into Dashboard.
- Adding drag/reorder before product hierarchy is stable.
- Showing dense panels before the user understands what matters.
- Using charts or metrics without a conclusion, reason, or evidence role.

### Apply to QuantTerminal

```text
Dashboard:
  conclusion first, then drivers, then evidence.

Markets:
  dense live verification with explicit freshness.

Research:
  progressive investigation, not a raw panel board.

Replay:
  event reconstruction with graceful unavailable states.

Scanner:
  ranked candidates with visible filters and aging state.

Trade:
  selected candidate, plan, invalidation, evidence.
```

The Make extraction is most useful as a visual and interaction audit. Its core
lesson is that QuantTerminal should keep terminal density, but only after the
product has made the intelligence hierarchy obvious.
