# English Version Upgrade Notes

Base source: `QuantTerminal_live_command_surface_equal_height_fetchjinse_clean.zip`.

## What changed

- Restored the English operator surface as the canonical branch baseline.
- Kept TypeScript identifiers, imports, object keys, and core engine contracts in English.
- Kept Korean/CN keyword strings only where they are required for news/source matching or Upbit DataLab parsing.
- Removed leftover Korean developer comments from the English branch.
- Preserved the equal-height Live Command Surface behavior.
- Preserved the clean Jinse fetcher behavior with quiet fallback.

## Branch suggestion

```bash
git checkout -b feature/english-intelligence-surface-v2
```

## Commit suggestion

```bash
git add .
git commit -m "refactor: restore English intelligence surface baseline"
```
