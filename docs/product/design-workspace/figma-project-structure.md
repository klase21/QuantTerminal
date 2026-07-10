# Figma Project Structure

**Status:** Canonical specification  
**Owner:** Product Design Operations  
**Scope:** Future Figma organization; this document does not create or edit a Figma file

## Project Model

Use one governed product-design project with separate files when scale or access
requires it. Shared libraries remain authoritative; screen files consume them.

## Canonical Pages

| Order | Page | Purpose | Canonical content |
| ---: | --- | --- | --- |
| 00 | Cover | Orientation and current status | owner, version, links, release state |
| 01 | Documentation | Upstream contract map | MASTER, IA, blueprint, Design System references |
| 02 | Design Tokens | Semantic foundation | token roles and modes, never ungoverned raw values |
| 03 | Components | Reusable component library | atoms, molecules, organisms, states, accessibility |
| 04 | Templates | Stable screen composition | Dashboard, Replay, Research, Markets, Scanner, Trade, Workspace |
| 05 | Screens | Canonical screen designs | approved product screen frames |
| 06 | Prototype | Validated interaction flows | primary, secondary, failure, and return paths |
| 07 | Review | Review evidence and open decisions | checklists, annotations, acceptance status |
| 90 | Archive | Superseded canonical work | preserved history and replacement reference |
| 99 | Experiments | Non-canonical exploration | hypotheses, owner, expiry, and outcome |

## Components

Component organization follows:

```text
Foundations
  -> Atoms
  -> Molecules
  -> Organisms
  -> Templates
  -> Screen compositions
```

Component names match Design System names. Each component includes contract ID,
version, owner, supported variants, states, responsive rules, and accessibility
notes.

## Templates

Templates represent blueprint hierarchy without product data. They define
regions, order, responsive priorities, and composition boundaries. Templates do
not own screen-specific conclusions or provider behavior.

## Design Tokens

Tokens are grouped by semantic family: color, spacing, radius, typography,
elevation, motion, border, opacity, transition, and breakpoint. Figma variables
or styles may express these roles later, but their canonical meaning remains in
the Design System documentation.

## Prototype

Prototype pages contain named flows, starting points, expected outcomes,
supported viewport, test status, and links to the source screen frames. Prototype
frames never become the sole source of a component contract.

## Archive

Archive by release or decision, preserving original identifiers and recording:

- deprecated date;
- replacement artifact;
- reason;
- migration status;
- owner.

Archived assets are not published in active libraries.

## Experiments

Every experiment states a hypothesis, owner, scope, start date, review date,
success criteria, and disposal decision. Experiments cannot use fabricated
evidence to imply product validity and cannot be handed to engineering as
approved work.

## File and Page Governance

- One cover identifies canonical status.
- One published source exists for each shared component.
- Branches or exploratory files merge through review, not by copying frames.
- Page numbering remains stable.
- File ownership and edit access are explicit.
- Published updates include release notes and consumer impact.

