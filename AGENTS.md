# QuantTerminal Agent Instructions

## Project Identity

QuantTerminal is a Tactical Decision OS and Market Intelligence Replay Platform for crypto markets.

The product direction is:

- Macro -> Narrative -> Execution
- Event Intelligence
- Prediction Market Expectation Layer
- Market Replay / Market Forensics
- Setup Outcome Memory

The system should reduce decision fatigue and improve tactical decision-making. Prefer features that help users understand what matters now, why it matters, and how it may affect execution.

## Non-Negotiable Rules

- Do not change websocket or API endpoints unless explicitly requested.
- Do not change the current futures depth/orderbook implementation.
- Do not create extra Markdown files except `README.md`, `AGENTS.md`, and required GitHub templates.
- Do not remove existing working features.
- Do not add noisy dashboard panels unless they improve tactical decision-making.
- Preserve the premium dark fintech UI.
- Prefer compact, high-density dashboard UX.
- Always run `npm run build` before finishing.

## Product And UX Guidance

- Optimize for tactical clarity over raw information volume.
- Favor verdict-first, execution-aware workflows.
- Keep dashboard surfaces dense, scannable, and calm.
- New UI should feel like a professional trading terminal, not a marketing page.
- Avoid decorative or low-signal panels. Every visible element should help explain market state, event context, narrative pressure, replay/forensics, or execution risk.
- Preserve existing working behavior unless the user directly asks for a change.

## Engineering Guidance

- This is a Next.js application. Use the existing structure, styling patterns, and component conventions.
- Keep changes scoped to the user request.
- Do not modify application logic when the task is documentation-only.
- Treat market data, event intelligence, prediction expectations, replay state, and outcome memory as separate concerns unless the existing codebase already connects them.
- Be especially careful around realtime data, websocket clients, API routes, futures depth, and orderbook code.

## Build

Run before finishing:

```bash
npm run build
```
