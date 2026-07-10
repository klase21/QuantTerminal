# User Flow

**Status:** Canonical user-flow architecture  
**Owner:** Product / Design  

## Purpose

User flows define how different users move through QuantTerminal without losing
context or encountering duplicated responsibilities.

## Beginner Flow

```text
Dashboard
  -> Evidence Cards
  -> Supporting Chart
  -> Simple Replay or Research link
  -> Watch / Ignore / Learn More
```

Goal: understand market state without being forced into raw data.

## Professional Flow

```text
Dashboard or Markets
  -> Scanner
  -> Evidence Quality Check
  -> Replay
  -> Trade or Research
```

Goal: move quickly from state to validation to planning.

## Research Flow

```text
Research
  -> Evidence
  -> Counter Evidence
  -> Charts
  -> Replay
  -> Repository
```

Goal: validate a thesis and inspect both support and contradiction.

## Daily Monitoring Flow

```text
Dashboard
  -> Markets
  -> Scanner
  -> Alerts / Watchlist
  -> Replay only when needed
```

Goal: monitor current market structure and changes without unnecessary depth.

## Incident Investigation Flow

```text
Dashboard or Markets
  -> Replay
  -> Timeline
  -> Evidence
  -> Research
  -> Repository
```

Goal: understand why a sudden move or anomaly happened.

## Trade Preparation Flow

```text
Scanner or Dashboard
  -> Trade
  -> Evidence
  -> Risk
  -> Replay
  -> Research
  -> User Decision
```

Goal: help users prepare, not decide for them.

## Flow Rules

- Flows preserve context.
- Flows remain reversible.
- Flows do not require raw repository access for basic understanding.
- Flows expose unavailable states.
- Flows keep human authority intact.

## Validation

User flows align with:

- beginner-to-professional experience;
- progressive disclosure;
- human decision authority;
- no fabricated confidence;
- screen ownership.
