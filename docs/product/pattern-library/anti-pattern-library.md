# Anti-Pattern Library

**Status:** Canonical product anti-pattern governance  
**Owner:** Product / Design  
**Source:** Competitive Intelligence Repository and `MASTER_PRODUCT.md`  

## Purpose

Anti-patterns identify product behaviors QuantTerminal should avoid even when
they appear in successful products.

An anti-pattern is not simply a bad UI choice. It is a repeated product failure
mode that damages trust, responsiveness, evidence clarity, or user authority.

## Anti-Patterns

| Name | Problem | Observed In | Negative Impact | Evidence | QuantTerminal Rule | Examples |
| --- | --- | --- | --- | --- | --- | --- |
| Too Much Text Before Evidence | Users must read paragraphs before seeing market state. | Research-heavy products and long-form dashboards. | Slow first read, high cognitive load. | Competitive reviews show best products lead with chart/card/state. | Visual before text. | Long explanations above charts; narrative without source cards. |
| Duplicate Cards | Same metric appears repeatedly with different labels. | Dense dashboard products. | Confusion and wasted attention. | CoinGlass/CoinAnk-style density can duplicate metric clusters. | One primary message per screen. | OI shown in three cards without distinct purpose. |
| Navigation Overload | Too many top-level destinations compete. | Category-heavy crypto analytics products. | Users cannot tell where workflows belong. | DefiLlama-style breadth works only with clear grouping. | Page ownership remains distinct. | Separate nav items for every dataset instead of durable categories. |
| Hidden Actions | Important actions appear only on hover or inside obscure menus. | Dense terminals and chart tools. | Discoverability loss, accessibility risk. | Expert products can rely on training; QuantTerminal cannot. | Important workflows must be visible or searchable. | Hidden export, hidden replay link, hidden source detail. |
| Information Overload | Dense information has no hierarchy. | Professional and derivatives dashboards. | Users scan many panels without understanding the main point. | Bloomberg density works for trained users; CoinGlass density can overwhelm. | 5-Second Rule and progressive disclosure. | Dashboard starts with 12 equal metric cards. |
| AI Conclusions Without Evidence | AI states conclusions without traceable evidence. | Emerging AI finance tools and generic assistants. | False authority and fabricated confidence. | MASTER_PLAN and MASTER_PRODUCT prohibit unsupported conclusions. | Reasoning always references evidence. | "Bullish because sentiment improved" without source. |
| Excessive Animations | Motion draws attention without improving understanding. | Consumer dashboards and trading interfaces. | Reduces seriousness, distracts from evidence. | Competitive review favors functional over decorative motion. | Trust over attention. | Pulsing hype cards; animated numbers without meaning. |
| Visual Inconsistency | Each page uses different states, cards, colors, or layouts. | Community dashboard ecosystems. | Product feels fragmented and hard to learn. | Dune flexibility shows quality can vary by author. | Consistency over novelty. | Different unavailable labels on Dashboard and Replay. |
| Feature-First Design | Product adds features before defining user decision path. | Broad analytics platforms. | Navigation and IA sprawl. | Successful products still have a core workflow identity. | Product decisions must support mission and user understanding. | Adding a new panel because data exists. |
| Metric-First Instead Of Decision-First | Metrics are shown before the user knows what question they answer. | Derivatives and protocol dashboards. | Users infer unsupported meaning. | CoinGlass and CryptoQuant patterns need decision framing. | Headline -> Evidence -> Reasoning -> Supporting Data. | Funding, OI, and liquidation cards with no market read. |
| Source-Ambiguous Evidence | Metrics appear without source, timestamp, or freshness. | Many public crypto dashboards. | Trust loss and possible false certainty. | Source transparency is highest-confidence pattern. | Missing freshness remains explicit. | Flow value without source time. |
| Black-Box Confidence | Product shows confidence without explaining source or calculation. | Signal-like analytics products. | Users mistake model output for fact. | Competitive analysis rejects signal-like overclaiming. | Confidence must be source-backed or unavailable. | "87% confidence" with no method. |
| Social Feed Drift | Community content becomes the product's evidence layer. | TradingView/Dune-style community surfaces. | Quality varies and product authority blurs. | Community patterns need governance. | Evidence Cards are source-backed, not popularity-backed. | Most-liked chart idea shown as market truth. |
| Unbounded Heavy Data | Heavy datasets load automatically in request path. | Historical replay/orderbook failure modes. | Slow pages and degraded responsiveness. | AGENTS.md and ADRs forbid expensive request-path reconstruction. | Responsiveness > Completeness. | Auto-loading all aggTrades/orderbook snapshots. |
| Color-Only Meaning | State is communicated only by red/green or heatmap intensity. | Charting and derivatives dashboards. | Accessibility and misinterpretation risk. | MASTER_PRODUCT requires text/labels/icons. | Color must not be the only carrier of meaning. | Red card with no state label. |

## Permanent Anti-Pattern Rules

1. Do not hide missing data.
2. Do not invent confidence.
3. Do not put metrics before the user question.
4. Do not make every panel equal.
5. Do not make AI sound authoritative without evidence.
6. Do not treat community popularity as truth.
7. Do not use motion as a substitute for hierarchy.
8. Do not allow dense screens without progressive disclosure.
9. Do not auto-load heavy historical datasets.
10. Do not let page ownership collapse into one mega-dashboard.
