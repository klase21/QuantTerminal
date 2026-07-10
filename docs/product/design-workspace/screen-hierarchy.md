# Screen Hierarchy

**Status:** Canonical design-workspace screen map  
**Owner:** Product Design  
**Source:** Master Information Architecture and Product Blueprint Pack

## Global Shell

The global shell owns primary navigation, search entry, current context,
workspace access, and operational status. It does not own screen content.

## Primary Screens

| Screen | Primary question | First-read hierarchy | Blueprint | Design status |
| --- | --- | --- | --- | --- |
| Dashboard | What is happening and why should I care? | Direction -> reasons -> evidence -> prediction context -> alerts | PDGM-101 | Ready for design |
| Markets | Which markets deserve attention? | Overview -> sectors -> flows -> derivatives -> macro/prediction evidence | PDGM-105 | Ready for design |
| Scanner | What changed and needs attention? | Ranked opportunities -> filters -> evidence -> risk -> handoffs | PDGM-104 | Ready for design |
| Trade | How should I evaluate this candidate? | Thesis -> evidence -> risk -> scenarios -> execution notes | PDGM-106 | Ready for design |
| Research | Why should I believe this thesis? | Headline -> summary -> evidence -> reasoning -> counter-evidence -> sources | PDGM-103 | Ready for design |
| Replay | What happened in this window? | Summary -> timeline/chart -> evidence -> OI -> funding -> liquidation -> optional heavy data | PDGM-102 | Ready for design |
| Settings / Operations | What is configured or operationally available? | Scope -> status -> configuration -> impact -> safe action | Future dedicated blueprint | Structure only |
| Workspace | How do I preserve and compare context? | Pinned context -> saved layouts -> panels -> synchronization -> cross-screen state | PDGM-109 | Partial; core screens first |

## Hierarchy Constraints

### Dashboard

Dashboard remains lightweight. It may link to historical context but does not
host heavy historical workflows or a restored Historical Analog module.

### Replay

Replay prioritizes chart, liquidations, open interest, funding, then optional
orderbook evidence. Optional heavy data fails locally and never blocks the core
screen.

### Research

Research owns deep historical and source investigation. Historical systems are
manual-load unless a later approved contract changes that behavior.

### Settings / Operations

Only foundational shell and status patterns may be designed before a dedicated
blueprint establishes complete ownership.

### Product Workspace

Workspace designs may define context preservation and layout mechanics, but
saved-layout, collaboration, and advanced synchronization behavior remain
partial until core screen contracts stabilize.

## Future Screens

Repository detail, Alerts, enterprise administration, collaboration, plugins,
automation, reasoning review, and agent surfaces require dedicated blueprints
before canonical screen design.

Future screens enter the hierarchy only after purpose, owner, primary question,
evidence requirements, navigation, states, and dependencies are approved.

## Cross-Screen Depth

```text
Dashboard / Markets / Scanner
  -> Trade or Replay
  -> Research
  -> Repository detail
```

Navigation preserves symbol, timeframe, date, selected evidence, candidate, or
thesis when valid. Every deep workflow provides a return path.

