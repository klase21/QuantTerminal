# Component Inventory

**Status:** Product Architecture Gate artifact  
**Sprint:** P1.5R Product Architecture Review and Blueprint Certification  
**Owner:** Product / Design  
**Scope:** Reusable UI component inventory only. No implementation.  

## Purpose

This inventory extracts reusable components implied by MASTER_PRODUCT,
Information Architecture, Pattern Library, and the Product Blueprint Pack.

Components do not own business logic. They present source-backed information,
navigation, interaction, and state consistently.

## Inventory

| Component | Owner | Used By | Priority | Reuse Potential | Notes |
| --- | --- | --- | --- | --- | --- |
| Evidence Card | Evidence / Product | Dashboard, Replay, Research, Scanner, Markets, Trade | P0 | Very High | Core trust unit with source, timestamp, confidence, limitations, contradiction, and repository link. |
| Metric Card | Product / Visualization | Dashboard, Markets, Scanner, Trade | P1 | High | Must not become metric-first clutter. Requires source and state labels. |
| Chart Card | Product / Visualization | Dashboard, Replay, Research, Markets, Trade | P0 | Very High | Visual-first carrier for market state and supporting data. |
| Research Panel | Research | Research, Replay, Trade | P1 | High | Deep context, source notes, and counter-evidence. |
| Timeline | Replay / Research | Replay, Research, Decision Flow | P1 | High | Source-backed sequence of events and evidence changes. |
| Sidebar | Navigation / Workspace | All product screens | P1 | High | Secondary navigation and workspace context. |
| Toolbar | Navigation / Interaction | Replay, Markets, Research, Repository | P1 | High | Controls for time, filters, density, and view state. |
| Primary Navigation | Navigation | All screens | P0 | Very High | Stable top-level product ownership. |
| Workspace Switcher | Workspace | All screens | P2 | High | Saved layouts and pinned context after core screens stabilize. |
| Search | Navigation / Search | All screens | P0 | Very High | Search-first navigation pattern. |
| Filter Control | Product / Interaction | Markets, Scanner, Replay, Research, Repository | P0 | Very High | Filters refine evidence without hiding warnings. |
| Heatmap | Visualization | Markets, Dashboard, Replay | P1 | Medium | Requires accessibility state redundancy. |
| Modal | Design System | All screens | P2 | Medium | Use for focused tasks only. Avoid hiding primary workflows. |
| Drawer | Design System | All screens | P1 | High | Useful for source detail, evidence detail, and context panels. |
| Toast | Design System | All screens | P1 | Medium | Use for non-blocking status. Must not hide unavailable data. |
| Tabs | Design System | Research, Replay, Markets, Trade | P1 | High | Useful for grouped depth where ownership remains clear. |
| Accordion | Design System | Research, Evidence Cards, Settings | P2 | Medium | Use for progressive disclosure, not primary state. |
| Badge | Design System | All screens | P0 | Very High | Provider tier, availability, freshness, status, canonical/experimental state. |
| Status Indicator | Design System / Evidence | All screens | P0 | Very High | UNAVAILABLE, STALE, PARTIAL, EXPERIMENTAL, COMPLETE, READY. |
| Confidence Meter | Evidence | Evidence Cards, Scanner, Research, Trade | P1 | Medium | Only when source-backed. Otherwise show UNAVAILABLE. |
| Repository Link | Repository / Evidence | Evidence Cards, Replay, Research, Trade | P0 | High | Traceable path to raw facts and lineage. |
| Counter Evidence Card | Evidence / Research | Research, Trade, Decision Flow | P1 | High | Prevents one-sided conclusions. |
| Breadcrumb | Navigation | Replay, Research, Repository, Trade | P1 | High | Preserves investigation path. |
| Density Control | Product / IA | All screens | P0 | High | Supports beginner to professional ladder. |
| Saved View Control | Workspace | All screens | P2 | High | Preserves user context, not claims. |
| Source Metadata Panel | Evidence / Repository | Evidence Cards, Research, Replay | P0 | High | Shows source, freshness, provider tier, limitations. |
| Pagination / Bounded Loader | Replay / Repository | Replay, Repository, Research | P0 | High | Required for heavy datasets and responsiveness. |
| Empty State / Unavailable State | Design System | All screens | P0 | Very High | Must provide explicit reason. |

## Duplicate Component Findings

No duplicate component ownership is required. Several components appear across
screens, but they are reusable primitives rather than duplicated
responsibilities.

## Certification Finding

The component inventory is ready for Design System P1.6.

**Highest priority component families:** Evidence Card, Status Indicator,
Badge, Source Metadata Panel, Search, Filter, Chart Card, Density Control,
Primary Navigation, Empty State.

