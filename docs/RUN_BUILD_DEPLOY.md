# Run, Build, and Deploy

## Install

```bash
npm install
```

## Run Dev Server

```bash
npm run dev
```

## Build

```bash
npm run build
```

## TypeScript Notes

The build stabilization pass removed the unsupported TypeScript 6 deprecation setting and pins the project to a stable TypeScript 5.x path.

If a build fails, check:

1. TypeScript version in `package.json`.
2. `tsconfig.json` for unsupported compiler flags.
3. accidental localization of TypeScript identifiers.
4. imports that reference renamed files.
5. object keys that were translated instead of UI labels.

---

## API / Cache Notes

Large Binance responses must not be cached by Next.js data cache.

Use:

```ts
cache: "no-store"
```

for large/volatile upstream payloads.

Avoid fetching the full Binance 24hr ticker payload. Use symbol validation and chunked fetches instead.

---

## Deployment Notes

Before deployment:

- run `npm run build`
- verify `/api/market/sector-rotation`
- verify Upbit DataLab snapshot/history routes
- verify WebSocket fallback behavior
- verify diagnostics page for degraded states
- verify UI on desktop and mobile widths

---

## Recommended Branch Flow

```bash
git checkout -b feature/realtime-stabilization
npm run build
git add .
git commit -m "docs: add release documentation for intelligence terminal"
git push origin feature/realtime-stabilization
```
