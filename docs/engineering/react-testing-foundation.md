# React Foundation Testing

## Strategy

R0 reuses TypeScript and the repository's `tsx` smoke-runner pattern. No test package is added.

## Static Render Checks

`workers/component-tests/runReactFoundationSmokeTest.tsx` verifies:

- canonical error semantics;
- textual experimental status;
- evidence provenance and limitations;
- unavailable metrics do not render zero;
- missing metrics do not render neutral;
- a genuine observed zero remains visible;
- reasoning is blocked without supporting evidence references;
- unavailable Repository handoffs omit links;
- icon-only actions have accessible names.

## Type Checks

`workers/component-tests/reactFoundationTypeChecks.ts` verifies:

- lifecycle and availability remain separate;
- freshness, coverage, and confidence remain separate;
- required component props are enforced;
- unsupported variants fail compilation.

## Commands

```text
npx.cmd tsc --noEmit --pretty false --incremental false
npx.cmd tsx workers/component-tests/runReactFoundationSmokeTest.tsx
```

Build validation is not part of R0 because `AGENTS.md` prohibits `npm run build`. Browser, responsive, keyboard, and reduced-motion results must be reported only when actually executed.

