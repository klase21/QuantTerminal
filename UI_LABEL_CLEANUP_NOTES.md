# UI Label Cleanup

This patch keeps internal TypeScript identifiers and enum values unchanged, but formats user-facing labels before rendering.

## Cleaned examples

- `FLOW_ONLY` -> `Flow Only`
- `AI_VALIDATED` -> `AI Validated`
- `ROTATION_ONLY` -> `Rotation Only`
- `HIGH_TRUST` -> `High Trust`
- `P1/P2/P3` -> `Priority 1/2/3`
- `QS` -> `Quality Score`
- `DIV` -> `DIVERGENCE`

Internal IDs remain stable for scoring, cooldown, analytics, and alert routing.
