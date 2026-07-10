# React Foundation Architecture

## Ownership

```text
lib/design-system/tokens
  -> components/ui/foundation
  -> components/feedback | components/navigation | components/evidence
  -> product components
  -> pages
```

- `lib/design-system/tokens` owns semantic visual variables.
- `lib/design-system/contracts` owns normalized presentation contracts.
- `lib/design-system/fixtures` owns deterministic, synthetic preview values only.
- `components/ui/foundation` owns low-level primitives.
- `components/feedback` owns lifecycle and data-state presentation.
- `components/evidence` owns bounded P0 evidence semantics.
- `components/navigation` owns safe presentation handoffs.
- `components/layout/foundation-layout.tsx` owns small composition primitives.
- `components/foundation-preview` composes the isolated development gallery.

## Boundaries

Shared components accept typed view models. They do not accept arbitrary provider payloads, fetch data, write Repository records, infer facts, or orchestrate routes. A future feature adapter must normalize API or Repository data before rendering.

All foundation components are server-compatible. No foundation file introduces a client boundary because R0 interactions use native links and controls. A future client boundary must be placed at the smallest interactive owner.

## Public Exports

Each component domain exposes a bounded `index.ts`. The contract and token entry point is `lib/design-system/index.ts`. Product code should import from the owning domain and must not import preview fixtures.

## Prohibited Dependencies

- tokens to React or pages;
- primitives to product components;
- shared presentation to APIs, providers, or Repository writes;
- preview fixtures to production orchestration;
- page-specific adapters to primitives.

## Migration Strategy

R0 is additive. R1 may adopt the foundation screen-by-screen through explicit feature adapters. Existing product components remain authoritative until their migration is separately approved.

## Preview and Tests

`/component-preview` is development-only, absent from production navigation, and uses fixed synthetic fixtures. Static-render smoke tests validate markup contracts; TypeScript validates contract separation and invalid variants.

