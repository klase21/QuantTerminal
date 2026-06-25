# Dashboard Design Audit

Status: Sprint 73 design-token audit  
Scope: Dashboard visual analysis only  
Runtime changes: none  
Primary references:

- `docs/project/dashboard-v2-state.md`
- `docs/project/dashboard-design-system.md`
- `docs/project/DASHBOARD_VISUAL_MOCKUP_V1.md`
- `docs/project/DASHBOARD_MOCKUP_V2.md`
- `docs/project/DESIGN.md`
- `docs/project/MAKE_ANALYSIS.md`

## Executive Summary

The current Dashboard implementation is substantially aligned with the approved Dashboard V2 state. The information hierarchy is correct:

```text
Market Direction
-> Top Drivers
-> Evidence Preview
-> Historical Analog
-> Prediction Markets
-> Tactical Alerts
-> Supporting Analytics
```

The remaining gaps are visual-system gaps, not product-architecture gaps. The Dashboard now behaves like an intelligence surface rather than a raw widget board, but its visual language is still partly implemented through local Tailwind class choices instead of a fully governed token system.

Overall design-token alignment score: **81 / 100**

The next visual sprint should be a typography-token pass, not another hierarchy pass.

## Score Summary

| Category | Score |
| --- | ---: |
| Typography | 82 |
| Color System | 78 |
| Surface System | 84 |
| Card System | 80 |
| Badge System | 86 |
| Spacing System | 81 |
| Responsive Layout | 74 |
| Figma Alignment | 83 |

## 1. Typography

Score: **82 / 100**

### Current

- Monospace styling is used consistently enough to preserve the QuantTerminal terminal identity.
- The hero direction uses dominant uppercase type and remains the first eye landing.
- Section titles use compact uppercase text with wide tracking.
- Numeric values in the hero, driver cards, and evidence cards are visually emphasized.
- Metadata is generally small, uppercase, and secondary.

### Expected

The approved design system expects a stricter role-based type hierarchy:

- Hero direction: 56-96px desktop, black weight, tight line height.
- Section title: 10-12px, uppercase, wide tracking.
- Card title: 14-17px for drivers and evidence.
- Metadata: 8-10px, muted, uppercase.
- Numeric values: role-specific scale, with no hero-scale values outside the hero.

### Gap

- Typography roles are present but not yet expressed as formal reusable Dashboard tokens.
- Some sections still rely on local class combinations rather than a consistent type-role system.
- Dense analytics still contain mixed local title/value scales.
- Several uppercase metadata blocks compete for attention because tracking and weight are similar across levels.

### Recommendation

Sprint 74 should be a **Typography Token Pass**:

- Define Dashboard role classes for hero direction, hero metadata value, section title, card title, body evidence, compact metadata, badge text, and analytics value.
- Apply those roles section by section without changing data, hierarchy, labels, fetches, or routing.

## 2. Color System

Score: **78 / 100**

### Current

- The Dashboard preserves the dark terminal identity.
- Amber, cyan, green, rose, zinc, and black surfaces are used consistently enough for recognition.
- Hero tone changes by market direction.
- Evidence state and driver direction use visible semantic color.
- Missing and unavailable states are muted rather than treated as valid evidence.

### Expected

The approved token model expects named visual roles:

- `background.base`
- `surface.level1`
- `surface.level2`
- `surface.level3`
- `surface.level4`
- `border.subtle`
- `border.strong`
- `accent.amber`
- `accent.cyan`
- `state.positive`
- `state.negative`
- `state.neutral`
- `state.missing`
- `text.primary`
- `text.secondary`
- `text.muted`

The Make reference emphasizes dark green-black surfaces, dark olive borders, amber rails, cyan metadata, and explicit state colors.

### Gap

- The implementation still leans heavily on raw zinc/black Tailwind surfaces.
- Dark green/olive terminal surfaces are present in intent but not uniformly dominant.
- Cyan section headers sometimes carry more visual weight than the amber structural system.
- Gradients are useful in the hero and evidence cards, but some are local rather than token-governed.

### Recommendation

Create a **Color Token Consolidation** sprint:

- Map existing Tailwind classes to Dashboard token roles.
- Reduce one-off surface gradients outside Level 1 and priority evidence.
- Rebalance cyan toward metadata and amber toward structure.
- Keep the existing dark terminal palette; do not introduce pastel or generic SaaS colors.

## 3. Surface System

Score: **84 / 100**

### Current

- The implementation defines Level 1-4 panel classes.
- Market Direction uses Level 1 and is visually dominant.
- Top Drivers and Evidence Preview use Level 2.
- Prediction Markets and Tactical Alerts read as secondary.
- Analytics are visually de-emphasized and grouped below the first-read layer.

### Expected

Surface levels should express:

- Level 1: Market Direction hero only.
- Level 2: first-read reasoning and evidence.
- Level 3: secondary decision support.
- Level 4: dense analytics and validation.

The visual mockups prefer dark green-black panels, olive borders, amber rails, and small terminal radius.

### Gap

- Level distinctions exist, but some surfaces still feel softer and rounder than the Make terminal reference.
- `rounded-lg` creates a more modern card feel than the 2-4px terminal panel radius in the mockups.
- Level 2 surfaces sometimes feel cyan-led rather than dark-green/amber-led.
- Historical Analog uses a successful custom strip treatment, but it is not yet represented as a formal surface variant.

### Recommendation

Run a **Surface Calibration** sprint:

- Tighten non-hero card radius where appropriate.
- Establish a Historical Strip surface variant.
- Keep Level 1 unique.
- Preserve Level 2/3/4 hierarchy without moving sections.

## 4. Card System

Score: **80 / 100**

### Current

- Card hierarchy is mostly standardized through shared `Card`, panel level, and section-header constants.
- Hero metadata cards are balanced again: Confidence, Driver Count, Data Health.
- Top Driver cards have clear rank, category, direction, summary, and impact areas.
- Evidence cards expose type, status, observation, and source.
- Lower analytics use quieter card treatments.

### Expected

Cards should follow:

- 1px borders.
- Small terminal radius.
- Consistent header layout.
- 12px primary padding.
- Compact rows for lower-priority content.
- Metadata placed predictably.
- No single hero metadata card may dominate.

### Gap

- Some lower cards still use custom local row/card anatomy instead of a shared pattern.
- Inner panels vary between `bg-black/30`, `bg-black/40`, and section-specific surfaces.
- Metadata placement is good in first-read sections but less consistent in analytics.
- The hero metadata rhythm is correct, but the right-side card visuals are more modern-card than terminal-panel.

### Recommendation

Run a **Card Anatomy Standardization** sprint:

- Standardize inner panel surface classes.
- Align footer/source metadata placement.
- Keep hero metadata labels unchanged.
- Avoid component extraction unless explicitly requested.

## 5. Badge System

Score: **86 / 100**

### Current

- State badges are explicit and text-visible.
- `CURRENT`, `VERIFIED`, `PARTIAL`, `DEGRADED`, `STALE`, `MISSING`, `UNAVAILABLE`, and `LOADING` concepts are represented through the current health/state language.
- Evidence cards visually distinguish high, medium, and low evidence quality.
- Direction badges use both text and color.

### Expected

Badges should:

- use text plus color;
- make missing/unavailable visibly weaker than current/verified;
- avoid color-only meaning;
- keep loading distinct from no data;
- keep stale distinct from current.

### Gap

- `MISSING` and `UNAVAILABLE` are sometimes visually close because both rely on muted zinc treatment.
- `DEGRADED` and `PARTIAL` could use a more consistent amber hierarchy.
- Badge radius, padding, and border intensity vary by local section.
- Loading states are explicit, but loading badge treatment is not fully standardized across all sections.

### Recommendation

Run a **Badge State Harmonization** sprint:

- Normalize badge padding, border, and text scale.
- Separate `MISSING` from `UNAVAILABLE` visually while keeping both muted.
- Keep all state text explicit.

## 6. Spacing System

Score: **81 / 100**

### Current

- The main page uses compact 12px-ish spacing.
- First-read sections are grouped clearly.
- Driver and evidence gaps are tight and scannable.
- Analytics are separated by a clear lower-priority divider.
- Dense rows are compact without becoming unreadable.

### Expected

The design system expects:

- desktop section gap: 12px;
- card gap: 8px;
- primary card padding: 12px;
- compact row spacing: 6-8px;
- mobile spacing that preserves order before density.

### Gap

- Spacing is close but not fully role-tokenized.
- Some lower analytics cards still have local vertical rhythm.
- Evidence cards and driver cards are visually coherent, but not obviously governed by a shared spacing scale.
- The first-read stack is strong, but fold fit should be validated by screenshot rather than assumed.

### Recommendation

Run a **Spacing and Density Audit** after typography/color tokens:

- Verify desktop, tablet, and mobile screenshots.
- Tighten lower analytics row rhythm.
- Preserve the current first-read order.

## 7. Responsive Layout

Score: **74 / 100**

### Current

- The implementation uses responsive grid rules for hero, drivers, evidence, secondary support, and analytics.
- Market Direction remains first.
- Drivers remain before Evidence.
- Evidence remains before Historical Analog.
- Analytics remain below the first-read layer.

### Expected

Responsive behavior should preserve:

- mobile conclusion first;
- top three drivers before deep evidence;
- evidence before analytics;
- no chart or dense analytics above direction;
- compact state labels visible on small screens.

### Gap

- This audit did not run screenshot validation by instruction.
- Some dense card text may wrap differently on tablet/mobile than the visual mockups intend.
- The hero metadata cards stack responsively, but actual balance needs screenshot confirmation.
- The mobile mockup expects a very compact first viewport; implementation may still be taller than the spec because the hero contains badges, conclusion, metadata cards, and the approved structure.

### Recommendation

Run a **Responsive Screenshot Review** sprint:

- No data/router/API changes.
- Capture desktop, tablet, and mobile.
- Validate first viewport order and text overflow.
- Patch only responsive spacing/typography if needed.

## 8. Visual Identity

### Bloomberg Terminal

Assessment: **Partially present**

The Dashboard has dense panels, monospace text, compact rows, uppercase labels, and a dark terminal canvas. It does not fully match Bloomberg terminal sharpness because card radius, gradients, and modern shadows soften the interface.

### Intelligence Platform

Assessment: **Strongly present**

The page leads with Market Direction, then ranked drivers, then evidence. This is the intended intelligence sequence. It no longer behaves like a raw analytics dashboard.

### Generic SaaS

Assessment: **Low risk, but not zero**

The product avoids pastel cards and marketing layout. The remaining SaaS risk comes from `rounded-lg`, broad gradients, and some soft card treatments.

### Trading Dashboard

Assessment: **Secondary**

The Dashboard uses market data, but it does not lead with a chart, order book, or metric wall. It is closer to a market intelligence terminal than a trading dashboard.

## 9. Figma Alignment

| Section | Result | Notes |
| --- | --- | --- |
| Hero | PASS | Direction dominates, hero is first, metadata labels are approved and balanced. Exact radius/surface palette still needs token refinement. |
| Top Drivers | PASS | Exactly three visible drivers, rank is obvious, category and impact are scannable, remaining drivers collapse. |
| Evidence | PASS | Evidence is ordered and state-ranked, source/health visible, missing evidence is visually weaker. |
| Historical Analog | PASS | Reads as a compact strip rather than a heavy analytics panel. |
| Prediction Markets | PASS | Secondary placement and compact treatment are aligned with the mockup. |
| Tactical Alerts | PASS | Secondary decision-support role is clear. |
| Analytics | PARTIAL | Analytics are below the first-read layer and de-emphasized, but lower card anatomy and typography remain less standardized. |

Overall Figma alignment: **PARTIAL PASS**

The implementation follows the approved product hierarchy. Remaining differences are token fidelity, surface sharpness, and lower-layer consistency.

## 10. Prioritized Improvements

| Rank | Remaining visual difference | Estimated impact | Difficulty | Recommended sprint |
| ---: | --- | --- | --- | --- |
| 1 | Typography roles are not fully tokenized across Dashboard sections. | High | Medium | Sprint 74 |
| 2 | Surface colors still lean too much on raw zinc/black instead of governed dark green/olive roles. | High | Medium | Sprint 75 |
| 3 | Cyan is sometimes too structurally dominant; amber should own more structural rails and hierarchy. | Medium | Medium | Sprint 75 |
| 4 | Card radius is softer than the Make/Figma terminal panel intent. | Medium | Low | Sprint 76 |
| 5 | Inner card/panel anatomy varies across lower sections. | Medium | Medium | Sprint 77 |
| 6 | Badge state treatments need tighter differentiation for missing, unavailable, stale, partial, and degraded. | Medium | Low | Sprint 78 |
| 7 | Analytics typography and spacing are quieter, but not yet governed by a consistent Level 4 pattern. | Medium | Medium | Sprint 79 |
| 8 | Responsive first-viewport fit has not been visually validated after Sprint 62-70 changes. | High | Medium | Sprint 80 |
| 9 | Evidence cards are strong, but long summaries may still create uneven text density. | Medium | Low | Sprint 81 |
| 10 | Historical Analog strip works visually but should become a named surface/token variant. | Low | Low | Sprint 82 |

## Remaining Visual Gap

Dashboard V2 is no longer missing its product hierarchy. The remaining gap is implementation discipline:

```text
Approved hierarchy exists.
Approved states exist.
Approved sections exist.
Visual tokens are partially implicit.
```

The design should now move from section-by-section polish to token-by-token consolidation.

## Recommended Sprint 74 Roadmap

Sprint 74 should be:

```text
Dashboard Typography Token Pass
```

Scope:

- `DashboardV1.tsx` only if implementation is requested.
- Typography only.
- No data, API, router, URL, fetch, `useEffect`, scoring, or hierarchy changes.

Goals:

1. Define explicit Dashboard typography roles.
2. Apply roles to:
   - hero direction;
   - hero metadata value;
   - section title;
   - driver title;
   - evidence body;
   - source metadata;
   - badge text;
   - analytics value.
3. Preserve approved labels:
   - Confidence;
   - Driver Count;
   - Data Health.
4. Preserve the Sprint 69 approved hierarchy.

Acceptance:

- The Dashboard still reads:

```text
Conclusion
-> Reasons
-> Evidence
-> Analytics
```

- Typography is more consistent.
- No runtime behavior changes occur.

## Validation

- Runtime code modified: **No**
- Dashboard behavior modified: **No**
- APIs modified: **No**
- Router/search params modified: **No**
- Data or scoring modified: **No**
- New file created: `docs/project/dashboard-design-audit.md`
- Build run: **No**
- TypeScript run: **No**

This sprint was analysis-only.
