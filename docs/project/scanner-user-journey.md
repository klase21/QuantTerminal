# Scanner User Journey

Status: user journey foundation V1  
Scope: Scanner V2 workflow definition  
Runtime impact: none

## 1. Purpose

Scanner exists to answer:

```text
What deserves my attention right now?
```

The user journey is built around attention triage. Scanner should help the user detect meaningful signals, understand why they matter, discard noise, and move to the correct next page.

Scanner must not become Dashboard, Markets, Research, Replay, or Trade.

## 2. Journey A: 5-Second Scan

Goal:

The user should immediately answer:

```text
What deserves my attention right now?
```

Expected first-read sequence:

```text
Open Scanner
  -> see top priority opportunity
  -> see why it is ranked first
  -> see status or health
  -> decide whether to inspect or ignore
```

The first five seconds should expose:

- highest-priority signal;
- symbol or market;
- signal type;
- ranking position;
- evidence health;
- immediate next action.

The user should not need to inspect charts, deep analytics, or research narratives to understand the highest-priority signal.

Success:

- one signal clearly leads;
- ranking is visible;
- missing or stale evidence is explicit;
- next action is obvious.

Failure:

- every card has equal weight;
- the page behaves like a market overview;
- the user must read dense analytics before knowing what changed;
- unavailable evidence looks valid.

## 3. Journey B: 30-Second Investigation

Goal:

The user should understand:

- why the opportunity exists;
- how strong or weak the supporting evidence is;
- which signals support or weaken the opportunity;
- whether the signal should be opened elsewhere.

Expected sequence:

```text
Select or focus a ranked signal
  -> inspect signal reasons
  -> check evidence badges
  -> apply filters if needed
  -> compare against nearby opportunities
  -> choose next destination
```

The 30-second investigation should expose:

- top supporting signals;
- freshness and coverage state;
- signal category;
- relevant market metadata;
- compact evidence summary;
- navigation target.

Scanner may show confidence or quality metadata only when backed by existing evidence. It must not invent confidence, prediction, or trade advice.

Success:

- user understands why the opportunity is visible;
- user can compare the top few opportunities;
- filters remove irrelevant noise;
- supporting evidence is compact and traceable;
- missing data is clear.

Failure:

- Scanner becomes a dense Markets clone;
- Scanner presents long-form research;
- Scanner asks the user to interpret raw data without prioritization;
- ranking appears unsupported.

## 4. Journey C: Deep Investigation

Goal:

Scanner should route the user to the right destination without becoming the destination.

Navigation rules:

| User Need | Next Page | Reason |
| --- | --- | --- |
| High-conviction opportunity needs live structure validation | Markets | Markets owns live market structure, ranked symbols, breadth, sector rotation, exchange overview, and dense symbol validation |
| Signal needs deeper evidence or implication review | Research | Research owns narratives, evidence synthesis, historical analogs, Event Impact, and Market Memory |
| Signal resembles a historical event or requires playback | Replay | Replay owns historical reconstruction and evidence validation |
| Candidate is mature enough for execution planning | Trade | Trade owns thesis-to-execution planning |

Deep investigation sequence:

```text
Scanner signal
  -> choose destination
  -> preserve symbol / exchange / timeframe when available
  -> continue investigation in the destination page
```

Scanner should preserve investigation context when available, but it should not create a new research workflow inside the Scanner page.

## 5. Role-Based Workflows

### Active Trader

Primary question:

```text
What should I inspect before the market moves away?
```

Workflow:

```text
Scanner
  -> top ranked opportunity
  -> Markets for live validation
  -> Trade if execution planning is warranted
```

### Market Analyst

Primary question:

```text
Which market behavior is unusual enough to investigate?
```

Workflow:

```text
Scanner
  -> filter by signal type or market
  -> Markets for structure
  -> Research for implication
```

### Researcher

Primary question:

```text
Which signal deserves a deeper investigation?
```

Workflow:

```text
Scanner
  -> notable signal
  -> Research for evidence synthesis
  -> Replay for historical validation when relevant
```

## 6. Boundary Review

Scanner owns:

- opportunity prioritization;
- signal visibility;
- ranking;
- filtering;
- alert surfacing;
- handoff intent.

Scanner does not own:

- Dashboard conclusions;
- Markets exploration and structure analysis;
- Research narratives;
- Replay validation;
- Trade execution.

Boundary rule:

```text
Scanner finds the signal.
Markets validates live structure.
Research explains implication.
Replay validates what happened.
Trade plans execution.
Dashboard summarizes the market.
```

## 7. Success Criteria

Scanner succeeds when:

- a user identifies meaningful opportunities within approximately 10 seconds;
- the first five seconds reveal the top attention target;
- the next 30 seconds reveal why it matters;
- the user can route to Markets, Research, Replay, or Trade without ambiguity;
- unavailable evidence is explicit;
- no synthetic data is introduced.

Scanner fails when:

- it duplicates Dashboard market conclusions;
- it duplicates Markets dense structure analysis;
- it becomes a Research page;
- it performs Replay validation;
- it implies execution recommendations;
- it hides missing, stale, or partial data.

