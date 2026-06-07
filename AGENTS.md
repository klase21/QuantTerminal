# QuantTerminal Agent Instructions

## Project Identity

QuantTerminal is a Tactical Decision OS and Market Intelligence Replay Platform for crypto markets.

The system should reduce decision fatigue and improve tactical decision-making. Prefer features that help users understand what matters now, why it matters, and how it may affect execution.

## Project Direction

QuantTerminal is evolving into:

- Realtime Tactical Decision OS
- Market Intelligence Replay Platform
- Historical Intelligence / Market Memory System

Core product direction:

- Macro -> Narrative -> Execution
- Event Intelligence
- Prediction Market Expectation Layer
- Market Replay / Market Forensics
- Setup Outcome Memory

## Core Intelligence Layers

- Realtime Market Intelligence
- Historical Intelligence
- Event Memory
- Replay Engine
- Narrative vs Reality
- Prediction Market Expectation Layer
- Similar Historical Events
- Setup Outcome Memory

## Replay Principles

Replay is not just chart replay. `ReplayCase` is an event investigation.

Each `ReplayCase` should answer:

- What happened?
- What did people believe at the time?
- What did prediction markets / expectations imply?
- What actually happened?
- Which drivers mattered?
- Which narratives were unsupported?
- What can be learned for future setups?

Keep Replay / Market Forensics compact, evidence-driven, and useful for tactical review.

## Current Historical Intelligence Architecture

The project now includes:

- `core/replay`
- `core/historical-intelligence`
- mock Historical Intelligence repository
- read-only `/api/replay`
- `/replay` Market Forensics workspace

Keep `/replay` mock-first until a task explicitly asks to connect real historical data or database-backed repositories.

## Protected Architecture

Do not change unless explicitly requested:

- websocket/API endpoints
- futures depth/orderbook implementation
- orderbook/trade/liquidation sockets
- `lib/websocket`
- existing working dashboard routes
- `ReplayCase` canonical model without a migration plan

Do not remove existing working features.

## Non-Negotiable Rules

- Do not change websocket or API endpoints unless explicitly requested.
- Do not change the current futures depth/orderbook implementation.
- Do not create extra Markdown files except `README.md`, `AGENTS.md`, and required GitHub templates.
- Do not remove existing working features.
- Do not add noisy dashboard panels unless they improve tactical decision-making.
- Preserve the premium dark fintech UI.
- Prefer compact, high-density dashboard UX.

## Product And UX Guidance

- Optimize for tactical clarity over raw information volume.
- Favor verdict-first, execution-aware workflows.
- Keep dashboard surfaces dense, scannable, and calm.
- New UI should feel like a professional trading terminal, not a marketing page.
- Avoid decorative or low-signal panels. Every visible element should help explain market state, event context, narrative pressure, replay/forensics, execution risk, or historical memory.
- Preserve existing working behavior unless the user directly asks for a change.

## Engineering Guidance

- This is a Next.js application. Use the existing structure, styling patterns, and component conventions.
- Keep changes scoped to the user request.
- Do not modify application logic when the task is documentation-only.
- Treat market data, event intelligence, prediction expectations, replay state, and outcome memory as separate concerns unless the existing codebase already connects them.
- Be especially careful around realtime data, websocket clients, API routes, futures depth, and orderbook code.
- Keep mock-first Historical Intelligence work behind repository or adapter boundaries so later database-backed implementations can replace mocks without changing UI models.

## Validation Policy

Default for Codex tasks:

```bash
npx.cmd tsc --noEmit --pretty false --incremental false
```

Do not run `npm run build` by default in Codex because Codex build can timeout. The developer will run local final build validation before commit/merge.

Only run `npm run build` when explicitly requested or when modifying:

- `package.json`
- `package-lock.json`
- `next.config.js`
- app route architecture
- build tooling
- dependency setup

## Documentation Rule

Do not create extra `.md` files except:

- `README.md`
- `AGENTS.md`
- required GitHub templates
