# Design Token Registry

Status: canonical token registry V1  
Scope: Dashboard first, QuantTerminal-wide later  
References:

- `docs/project/dashboard-design-system.md`
- `docs/project/dashboard-design-audit.md`
- `docs/project/dashboard-v2-state.md`
- `docs/project/DESIGN.md`
- `docs/project/DASHBOARD_VISUAL_MOCKUP_V1.md`
- `docs/project/DASHBOARD_MOCKUP_V2.md`
- `docs/project/MAKE_ANALYSIS.md`

## 1. Philosophy

Design tokens are implementation primitives.

The Dashboard Design System defines visual rules:

- hierarchy;
- density;
- tone;
- allowed polish boundaries;
- forbidden drift.

The Design Token Registry defines implementation names:

- typography token names;
- color token names;
- surface token names;
- spacing token names;
- badge token names;
- border, radius, shadow, and glow token names.

Future implementation sprints must implement registry tokens instead of inventing new Tailwind combinations directly inside product components.

No implementation sprint may invent a new visual token without updating this registry. If a new token is necessary, the sprint must document:

- token name;
- purpose;
- allowed usage;
- relationship to existing tokens;
- reason existing tokens are insufficient.

This registry does not change runtime behavior. It is the naming layer that sits between the design system and code.

```text
Design System
  -> Token Registry
  -> Implementation
```

## 2. Typography Tokens

Typography remains monospace throughout. Space Mono is the preferred reference. IBM Plex Mono or the existing terminal monospace stack may be used for dense metadata, hashes, identifiers, and tabular rows.

### `typography.hero.direction`

Purpose: the primary Dashboard conclusion.

| Attribute | Value |
| --- | --- |
| Size | desktop 56-96px; target 72px; tablet 44-56px; mobile 32-40px |
| Weight | 800-900 |
| Tracking | 0.02em-0.04em |
| Line height | 0.86-0.95 |
| Transform | uppercase |
| Usage | `BULLISH`, `BEARISH`, `NEUTRAL`, or equivalent page-level conclusion |

Rules:

- Must be the largest text in the page's first-read layer.
- Must not be used inside evidence, analytics, or secondary cards.

### `typography.hero.conclusion`

Purpose: one-line explanation under the hero direction.

| Attribute | Value |
| --- | --- |
| Size | desktop 14-18px; tablet 13-16px; mobile 12-14px |
| Weight | 700-900 |
| Tracking | 0.06em-0.10em |
| Line height | 1.35-1.55 |
| Transform | uppercase |
| Usage | one-line conclusion that explains the top reason |

Rules:

- Maximum one line on desktop when practical.
- Maximum two lines on mobile.
- Must not become a paragraph.

### `typography.hero.metadata.value`

Purpose: balanced hero metadata values.

| Attribute | Value |
| --- | --- |
| Size | desktop 32-56px; tablet 26-36px; mobile 22-30px |
| Weight | 800-900 |
| Tracking | 0 |
| Line height | 0.95-1.05 |
| Transform | none for numeric values; uppercase for short states |
| Usage | Confidence, Driver Count, Data Health value |

Rules:

- Confidence, Driver Count, and Data Health must remain visually balanced.
- No single hero metadata value may dominate the hero side column.

### `typography.hero.metadata.label`

Purpose: approved labels under hero metadata values.

| Attribute | Value |
| --- | --- |
| Size | 9-10px |
| Weight | 800-900 |
| Tracking | 0.14em-0.18em |
| Line height | 1.1-1.25 |
| Transform | uppercase |
| Usage | `Confidence`, `Driver Count`, `Data Health` |

Rules:

- Do not rename approved labels during polish.
- Do not replace with `Conviction`, `Driver Metadata`, or similar terms unless the Dashboard constitution changes.

### `typography.section.title`

Purpose: section identity.

| Attribute | Value |
| --- | --- |
| Size | 10-12px |
| Weight | 800-900 |
| Tracking | 0.16em-0.20em |
| Line height | 1.1-1.25 |
| Transform | uppercase |
| Usage | Market Direction, Top Drivers, Evidence Preview, Analytics section labels |

Rules:

- Section titles identify hierarchy; they do not explain content.
- Avoid paragraph-like section headings.

### `typography.driver.rank`

Purpose: ranked driver marker.

| Attribute | Value |
| --- | --- |
| Size | 28-40px |
| Weight | 800-900 |
| Tracking | 0 |
| Line height | 0.95-1.05 |
| Transform | none |
| Usage | `#1`, `#2`, `#3` |

Rules:

- Rank must be visually obvious.
- Rank may use `color.accent.amber`.

### `typography.driver.title`

Purpose: driver identity.

| Attribute | Value |
| --- | --- |
| Size | desktop 15-17px; tablet 14-16px; mobile 14-15px |
| Weight | 800-900 |
| Tracking | 0.02em-0.04em |
| Line height | 1.15-1.25 |
| Transform | uppercase |
| Usage | top driver title |

Rules:

- One line where practical.
- No long explanations.

### `typography.driver.score`

Purpose: driver impact score.

| Attribute | Value |
| --- | --- |
| Size | 28-40px |
| Weight | 800-900 |
| Tracking | 0 |
| Line height | 0.95-1.05 |
| Transform | none |
| Usage | impact score displayed inside driver card |

Rules:

- Secondary to driver rank and title.
- Must not imply prediction.

### `typography.driver.summary`

Purpose: one-line driver evidence summary.

| Attribute | Value |
| --- | --- |
| Size | 10-11px |
| Weight | 700-900 |
| Tracking | 0.08em-0.12em |
| Line height | 1.35-1.55 |
| Transform | uppercase |
| Usage | short evidence-backed driver summary |

### `typography.evidence.title`

Purpose: evidence card label.

| Attribute | Value |
| --- | --- |
| Size | 9-11px |
| Weight | 800-900 |
| Tracking | 0.14em-0.16em |
| Line height | 1.1-1.25 |
| Transform | uppercase |
| Usage | ETF, Reserve, Treasury, OI, Liquidation, Exchange Flow, Funding |

### `typography.evidence.body`

Purpose: compact evidence observation.

| Attribute | Value |
| --- | --- |
| Size | 12-15px |
| Weight | 700-900 |
| Tracking | 0 |
| Line height | 1.35-1.55 |
| Transform | sentence case or uppercase according to existing component language |
| Usage | one- or two-line observed fact |

Rules:

- Evidence body is observation, not opinion.
- Keep source and health visible.

### `typography.evidence.metadata`

Purpose: source, health, freshness, and priority metadata.

| Attribute | Value |
| --- | --- |
| Size | 8-10px |
| Weight | 800-900 |
| Tracking | 0.10em-0.14em |
| Line height | 1.1-1.25 |
| Transform | uppercase |
| Usage | source, observed time, health label, evidence priority |

### `typography.analytics.title`

Purpose: lower-priority analytics section and card title.

| Attribute | Value |
| --- | --- |
| Size | 10-12px |
| Weight | 800-900 |
| Tracking | 0.14em-0.18em |
| Line height | 1.1-1.25 |
| Transform | uppercase |
| Usage | supporting analytics titles |

Rules:

- Must remain quieter than `typography.section.title` in the first-read layer.

### `typography.analytics.value`

Purpose: dense validation value.

| Attribute | Value |
| --- | --- |
| Size | 14-20px |
| Weight | 700-900 |
| Tracking | 0 |
| Line height | 1.05-1.20 |
| Transform | none unless label-like |
| Usage | lower analytics values, table totals, compact metrics |

Rules:

- No hero-scale type inside analytics.

### `typography.badge`

Purpose: state, quality, category, and freshness badges.

| Attribute | Value |
| --- | --- |
| Size | 8-10px |
| Weight | 800-900 |
| Tracking | 0.10em-0.14em |
| Line height | 1.1-1.2 |
| Transform | uppercase |
| Usage | badge text across product surfaces |

### `typography.row.label`

Purpose: dense terminal row label.

| Attribute | Value |
| --- | --- |
| Size | 9-10px |
| Weight | 700-900 |
| Tracking | 0.10em-0.14em |
| Line height | 1.15-1.30 |
| Transform | uppercase |
| Usage | compact row labels in Markets, Replay, Research, Settings health tables |

### `typography.row.value`

Purpose: dense terminal row value.

| Attribute | Value |
| --- | --- |
| Size | 11-13px |
| Weight | 700-900 |
| Tracking | 0 |
| Line height | 1.15-1.30 |
| Transform | none |
| Usage | compact row values and tabular facts |

## 3. Color Tokens

Color tokens name roles. Implementation may use Tailwind, CSS variables, or another mechanism, but the role must remain visible in code review.

| Token | Canonical value | Purpose | Usage |
| --- | --- | --- | --- |
| `color.background.base` | `#070d07` | page canvas | app background for terminal surfaces |
| `color.background.deep` | `#030805` | deepest layer | behind hero gradients or app chrome |
| `color.surface.level1` | `#07120b` | hero surface | Market Direction hero |
| `color.surface.level2` | `#0c140c` | primary card surface | drivers, evidence |
| `color.surface.level3` | `#111911` | secondary surface | prediction markets, tactical alerts |
| `color.surface.level4` | `#0a0f0a` | analytics surface | supporting analytics |
| `color.surface.active` | `#141e14` | active/input surface | selected controls, focused rows |
| `color.border.subtle` | `#1c2c1c` | quiet border | default panel border |
| `color.border.strong` | `#3a4d2c` | strong border | hero and active evidence |
| `color.border.muted` | `#142014` | low contrast border | analytics, unavailable cards |
| `color.text.primary` | `#d4dbd4` | main text | direction-supporting text, card values |
| `color.text.secondary` | `#a0b0a0` | secondary text | body evidence, secondary labels |
| `color.text.muted` | `#6b7d6b` | muted text | metadata, unavailable support |
| `color.text.dim` | `#3d503d` | lowest text | disabled metadata, low-priority separators |
| `color.accent.amber` | `#f97316` | structure and rank | rails, section accents, driver ranks |
| `color.accent.amber.dim` | `#7c3d12` | subdued amber | secondary rails, quiet warnings |
| `color.accent.cyan` | `#38bdf8` | information metadata | category labels, informational accents |
| `color.accent.cyan.dim` | `#075985` | subdued cyan | quiet metadata backgrounds |
| `color.state.positive` | `#22c55e` | constructive movement | bullish, positive evidence |
| `color.state.negative` | `#e53535` | adverse movement | bearish, negative evidence |
| `color.state.neutral` | `#facc15` | mixed or caution | neutral, uncertain, mixed evidence |
| `color.state.stale` | `#f59e0b` | stale evidence | stale badge and warning state |
| `color.state.missing` | `#71717a` | missing evidence | missing, unavailable, absent evidence |
| `color.state.loading` | `#38bdf8` | active loading | loading badge or skeleton tint |

Rules:

- `color.accent.amber` owns structure and hierarchy.
- `color.accent.cyan` owns metadata and informational accents.
- Do not use color alone to communicate state.
- Do not add pastel or generic SaaS palette tokens.

## 4. Surface Tokens

### `surface.hero`

Purpose: Level 1 conclusion surface.

| Attribute | Value |
| --- | --- |
| Depth | highest |
| Contrast | highest |
| Priority | Level 1 |
| Allowed usage | Market Direction hero, future page-level conclusion hero |

Rules:

- Only one `surface.hero` per primary page view.
- Must not be used for analytics.
- May use `shadow.hero` and `glow.hero`.

### `surface.primary`

Purpose: Level 2 reasoning and evidence surface.

| Attribute | Value |
| --- | --- |
| Depth | medium-high |
| Contrast | medium-high |
| Priority | Level 2 |
| Allowed usage | Top Drivers, Evidence Preview, primary page proof cards |

Rules:

- Must remain below hero visual weight.
- Should not contain dense raw tables.

### `surface.secondary`

Purpose: Level 3 secondary decision support.

| Attribute | Value |
| --- | --- |
| Depth | medium-low |
| Contrast | medium-low |
| Priority | Level 3 |
| Allowed usage | Prediction Markets, Tactical Alerts, secondary supporting sections |

Rules:

- Must not compete with Top Drivers or Evidence.

### `surface.analytics`

Purpose: Level 4 validation and detail surface.

| Attribute | Value |
| --- | --- |
| Depth | low |
| Contrast | low |
| Priority | Level 4 |
| Allowed usage | Supporting Analytics, data health detail, operational rows |

Rules:

- Dense is acceptable.
- No hero-scale typography.

### `surface.strip`

Purpose: compact horizontal context surface.

| Attribute | Value |
| --- | --- |
| Depth | medium-low |
| Contrast | lower than primary cards, higher than analytics |
| Priority | specialized Level 2.5 |
| Allowed usage | Historical Analog strip, future compact context strips |

Rules:

- No nested card wall.
- Use compact stat cells.
- Use muted amber structural accent.

### `surface.row`

Purpose: compact data row surface.

| Attribute | Value |
| --- | --- |
| Depth | low |
| Contrast | low-medium |
| Priority | content row |
| Allowed usage | dense lists, compact evidence rows, markets tables |

## 5. Radius Tokens

| Token | Value | Purpose | Usage |
| --- | ---: | --- | --- |
| `radius.hero` | 8px | premium hero container | Market Direction hero and future page heroes |
| `radius.panel` | 4px | terminal panel | primary, secondary, analytics cards |
| `radius.strip` | 4px | horizontal strip | Historical Analog and context strips |
| `radius.badge` | 999px or 4px by shape | compact state label | badges and pills |
| `radius.input` | 4px | controls | filters, inputs, segmented controls |

Rules:

- Prefer sharper panels over rounded SaaS cards.
- Badges may use pill radius, but panels should not become pill-like.

## 6. Border Tokens

| Token | Width | Color role | Purpose |
| --- | ---: | --- | --- |
| `border.hero` | 1px | `color.border.strong` | hero boundary |
| `border.primary` | 1px | `color.border.subtle` | Level 2 cards |
| `border.secondary` | 1px | `color.border.muted` | Level 3 cards |
| `border.analytics` | 1px | `color.border.muted` | Level 4 cards |
| `border.active` | 1px | `color.accent.amber` or `color.accent.cyan` | selected or active surface |
| `border.state.positive` | 1px | `color.state.positive` | positive evidence state |
| `border.state.negative` | 1px | `color.state.negative` | negative evidence state |
| `border.state.neutral` | 1px | `color.state.neutral` | neutral evidence state |
| `border.state.missing` | 1px | `color.state.missing` | missing or unavailable state |

Rules:

- Use 1px borders.
- Strong borders should be rare.
- Border intensity must follow surface priority.

## 7. Shadow and Glow Tokens

### `shadow.hero`

Purpose: premium depth for the page conclusion.

Allowed usage:

- `surface.hero` only.

Treatment:

- subtle dark depth;
- no floating SaaS card shadow;
- optional inset highlight.

### `shadow.panel`

Purpose: subtle separation for primary cards.

Allowed usage:

- `surface.primary`;
- selected or active secondary panels when necessary.

Treatment:

- minimal;
- should not imply elevation above hero.

### `shadow.none`

Purpose: default terminal flatness.

Allowed usage:

- analytics;
- compact rows;
- missing/unavailable surfaces.

### `glow.hero`

Purpose: subtle terminal energy around the primary conclusion.

Allowed usage:

- Market Direction hero only;
- future page-level conclusion heroes when approved.

Treatment:

- amber or state-aware glow;
- subdued;
- never neon.

### `glow.none`

Purpose: default state for most product surfaces.

Rules:

- Drivers, Evidence, Prediction Markets, Tactical Alerts, and Analytics should not use glow unless explicitly approved.

## 8. Spacing Tokens

| Token | Value | Purpose | Usage |
| --- | ---: | --- | --- |
| `space.page` | 12px desktop; 10px tablet; 8px mobile | page outer spacing | app canvas padding |
| `space.section` | 12px desktop; 10-12px tablet; 8-10px mobile | section gap | gap between major Dashboard sections |
| `space.card` | 8px | card gap | driver, evidence, and analytics grids |
| `space.panel` | 12px | card padding | primary panel interior |
| `space.panel.compact` | 10px | compact panel padding | secondary and analytics cards |
| `space.row` | 6-8px vertical | dense row spacing | compact lists and table-like rows |
| `space.badge` | 2-4px vertical, 6-8px horizontal | badge padding | state and category badges |
| `space.hero` | 20-32px desktop; 16-20px tablet; 12-16px mobile | hero interior | conclusion hero padding |
| `space.header` | 8-12px bottom | section header separation | title to content spacing |

Rules:

- Preserve order before reducing mobile spacing.
- Do not use large marketing-style gaps inside Dashboard.
- Density increases as page priority decreases.

## 9. Badge Tokens

Badges must use text plus color. Color alone is not enough.

### `badge.current`

Purpose: valid and current evidence.

Treatment:

- green/emerald text and border;
- dark positive-tinted surface;
- `typography.badge`.

Usage:

- fresh evidence;
- current artifact health;
- active live source.

### `badge.verified`

Purpose: validated evidence or verified source quality.

Treatment:

- green/emerald;
- slightly stronger than `badge.current` when validation matters.

Usage:

- verified evidence quality.

### `badge.partial`

Purpose: usable but incomplete evidence.

Treatment:

- amber text and border;
- dark amber-tinted surface.

Usage:

- partial coverage;
- incomplete source set.

### `badge.degraded`

Purpose: evidence exists but reliability is reduced.

Treatment:

- amber/orange warning tint;
- visually weaker than `badge.partial` if possible.

Usage:

- degraded source quality;
- fallback or partial reconstruction.

### `badge.stale`

Purpose: evidence exists but fails freshness policy.

Treatment:

- orange/amber warning tint;
- explicit `STALE` text.

Usage:

- stale artifacts;
- outdated source observations.

### `badge.loading`

Purpose: active request.

Treatment:

- cyan or muted informational tint;
- explicit `LOADING` text.

Rules:

- Do not show `NO DATA` while loading.

### `badge.missing`

Purpose: expected evidence is absent.

Treatment:

- muted zinc/gray;
- compact;
- visibly weaker than valid evidence.

Usage:

- expected artifact not present;
- required source missing.

### `badge.unavailable`

Purpose: source, cache, artifact, or computation cannot be used.

Treatment:

- muted zinc/gray with slightly stronger border than missing when user trust is affected;
- explicit reason nearby when critical.

Usage:

- failed source;
- invalid cache;
- unsupported evidence path.

### `badge.error`

Purpose: unexpected failure.

Treatment:

- red/rose warning;
- explicit text;
- no raw stack traces.

Usage:

- failed request or invalid payload.

## 10. Mapping

The registry creates a required mapping from design intent to implementation.

```text
Design System
  -> describes visual rules

Design Token Registry
  -> names implementation primitives

Implementation
  -> applies token names through Tailwind, CSS variables, constants, or components
```

### Example Mapping

| Design system concept | Registry token | Implementation expectation |
| --- | --- | --- |
| Market Direction is dominant | `typography.hero.direction`, `surface.hero`, `shadow.hero` | hero direction gets largest type and Level 1 surface |
| Metadata is secondary | `typography.hero.metadata.label`, `typography.hero.metadata.value` | Confidence, Driver Count, Data Health remain balanced |
| Drivers are ranked | `typography.driver.rank`, `typography.driver.title`, `surface.primary` | Top three driver cards show obvious rank |
| Evidence is compact proof | `typography.evidence.body`, `badge.current`, `badge.partial` | evidence cards show observation, health, and source |
| Analytics are lower priority | `surface.analytics`, `typography.analytics.title`, `typography.analytics.value` | lower panels remain dense and quiet |
| Historical context is lightweight | `surface.strip` | Historical Analog remains a strip |

### Implementation Rules

Future implementation sprints must:

1. reference this registry before changing visual classes;
2. implement existing tokens before adding new ones;
3. update this registry when a new token is required;
4. preserve approved Dashboard labels and hierarchy;
5. avoid data, API, router, fetch, or scoring changes during visual-token work.

## 11. Future Expansion

This registry starts with Dashboard because Dashboard V2 is the approved reference surface. It must later become the shared visual language for:

- Scanner;
- Replay;
- Markets;
- Research;
- Trade;
- Settings;
- Operations surfaces.

Future pages must reuse this registry instead of defining page-specific visual systems.

### Page-Specific Application

| Page | Token emphasis |
| --- | --- |
| Dashboard | `surface.hero`, driver tokens, evidence tokens |
| Markets | row tokens, dense analytics tokens, state badges |
| Scanner | driver/ranking tokens, signal badges, row tokens |
| Trade | thesis/conclusion tokens, risk badges, evidence cards |
| Research | investigation surfaces, evidence cards, strip/context surfaces |
| Replay | context strip, timeline rows, unavailable evidence badges |
| Settings | health badges, analytics surfaces, row labels |

### Expansion Rules

- Do not create page-specific color systems.
- Do not create page-specific badge languages.
- Do not create alternate typography scales unless documented here.
- Do not let page-specific density override the core hierarchy:

```text
Conclusion
-> Drivers
-> Evidence
-> Analytics
```

## 12. Registry Governance

This registry must be updated when:

- a new visual role is introduced;
- a new state badge is introduced;
- a new surface level is introduced;
- a page needs a reusable token not covered here;
- implementation discovers that a token is ambiguous.

This registry should not be updated for:

- one-off local class preferences;
- temporary experiments;
- runtime behavior changes;
- data or API changes;
- score or terminology invention.

Reviewers should reject visual implementation that:

- invents new token names without updating this file;
- bypasses token roles with one-off styling;
- changes the approved Dashboard hierarchy;
- changes approved labels during polish;
- introduces synthetic data or unsupported states.

## 13. Validation Checklist

Before any future visual implementation sprint merges, verify:

- token names are referenced in the sprint plan;
- implementation maps to registry tokens;
- no new token was invented without a registry update;
- Dashboard V2 state remains intact;
- `docs/project/dashboard-design-system.md` remains consistent with this registry;
- `docs/project/dashboard-design-audit.md` recommendations are addressed in order when relevant;
- no runtime behavior changes occur during visual token work.

