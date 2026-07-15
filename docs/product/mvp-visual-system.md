# MVP Visual System

## Purpose

The Working MVP uses the existing QuantTerminal foundation tokens. It is a compact operational interface: factual state first, interpretation second, and drill-down detail last. Page sections are unframed or singly bordered surfaces; nested decorative cards are avoided.

## Hierarchy

- Page header: page, governed/frozen status, instrument, Event Time, and Knowledge Time.
- Primary conclusion: one literal market-state heading and a short semantic explanation.
- Evidence: paired supporting and counter-evidence sections with equal prominence.
- Data quality: Coverage, freshness, limitations, and lineage remain distinct.
- Technical identity: checksums, versions, and recompute IDs live in bounded disclosure panels.

## Components

- `Badge`: explicit text plus severity tone; color is never the only carrier.
- `StatePanel`: announced loading, empty, partial, offline, and error states.
- `DataStateNotice`: source, as-of time, reason, retry implication, and conclusion impact.
- `Section`: consistent title, border, surface, and spacing.
- `MetricRows`: structured nested key/value presentation with bounded wrapping.
- `PageLink`: 44px minimum drill-down target with command direction.

## Semantics

Governed Projection uses cyan/info. Live overlay uses amber/warning and always appears beside, never merged with, the governed reference. Evidence strength uses explicit `Evidence strength` wording and is not probability. Coverage completeness uses success only when supplied by the governed Projection. Experimental and lower-bound sources use dashed warning treatment.

All MVP roots opt into `data-qt-foundation`, enabling the existing focus and reduced-motion rules. Caption text uses the 11px token minimum; controls use the 44px touch-target token.

