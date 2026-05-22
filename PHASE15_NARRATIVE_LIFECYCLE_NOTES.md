# Phase 15 — Narrative Lifecycle Engine

This phase introduces a compressed narrative lifecycle layer.

## Goal

QuantTerminal should not expose every metric on the main surface. The terminal now compresses rotation, breadth, liquidity, news heat, validation, and crowding into a simple narrative state:

- Early
- Expanding
- Viral
- Overcrowded
- Exiting
- Quiet

## Philosophy

Complexity stays inside the engine. The operator surface shows simple market states.

Example:

```txt
AI
Expanding
High Participation
```

Instead of exposing every underlying score at once.

## Added files

- `core/narrative/lifecycleTypes.ts`
- `core/narrative/deriveNarrativeLifecycle.ts`

## Updated surfaces

- `components/command/LiveCommandSurface.tsx`
- `components/narrative/NarrativeIntelligenceSurface.tsx`
- `core/narrative/generateNarrativeSurface.ts`
- `core/narrative/narrativeTypes.ts`

## Scoring inputs

The lifecycle engine uses:

- sector rotation score
- confidence
- volume pressure
- breadth
- premium boost
- news buzz
- narrative validation
- volatility/crowding pressure

## Output

Each lifecycle item includes:

- narrative
- phase
- participation
- confirmation
- crowding
- confidence
- headline
- operator detail
- drivers
