# Pattern Confidence

**Status:** Canonical pattern confidence register  
**Owner:** Product / Design  
**Review date:** 2026-07-09  

## Confidence Scale

| Rating | Meaning |
| --- | --- |
| ★★★★★ | Strongly validated across many high-relevance products. |
| ★★★★☆ | Strong pattern with several sources and clear QuantTerminal fit. |
| ★★★☆☆ | Useful pattern but domain-specific or needs careful adaptation. |
| ★★☆☆☆ | Weak or narrow pattern. |
| ★☆☆☆☆ | Not recommended as a product pattern. |

## Pattern Confidence Register

| Pattern Name | Source Count | Confidence | Reason |
| --- | ---: | --- | --- |
| Search-first navigation | 12 | ★★★★★ | Most strong products rely on fast symbol, entity, protocol, event, or dataset search. |
| Professional density with progressive disclosure | 10 | ★★★★★ | Bloomberg, Koyfin, CoinGlass, TradingView, and others show density works when hierarchy is stable. |
| Evidence card structure | 8 | ★★★★☆ | Cards appear across market, event, entity, ETF, and dashboard products; QuantTerminal can strengthen with source transparency. |
| Source transparency | 8 | ★★★★★ | Strongest long-term trust pattern; aligns directly with Repository and Evidence First. |
| Research chart narrative | 9 | ★★★★☆ | Glassnode, Kaiko, Koyfin, Token Terminal, and CryptoQuant show charts need explanatory context. |
| Workspace personalization | 10 | ★★★★☆ | Common across terminal, charting, monitoring, and dashboard tools; must preserve canonical facts. |
| Derivatives dashboard clusters | 6 | ★★★★☆ | CoinGlass, CoinAnk, Hyperliquid, CryptoQuant, and QuantTerminal's own data foundation make this highly relevant. |
| Institutional data trust | 9 | ★★★★★ | Bloomberg, Koyfin, Glassnode, Kaiko, and source-governed products show trust is a durable moat. |
| Visual-first chart interaction | 8 | ★★★★☆ | TradingView is dominant; Koyfin, Glassnode, and Hyperliquid reinforce chart interaction value. |
| Entity / wallet intelligence | 4 | ★★★☆☆ | Strong for Arkham/Nansen and future on-chain expansion, but not central to current product baseline. |
| Protocol / category grouping | 7 | ★★★★☆ | DefiLlama and Token Terminal validate category grouping for expansion domains. |
| Query / methodology transparency | 8 | ★★★★☆ | Dune, Kaiko, Glassnode, and Token Terminal show transparency improves trust. |
| Probability / event framing | 2 | ★★★☆☆ | Polymarket is the main source; useful for prediction evidence but must not become prediction. |
| Heatmap market scanning | 6 | ★★★☆☆ | Useful for derivatives and market scanning, but can become visually overwhelming. |
| Alert / monitoring workflow | 9 | ★★★★☆ | Common across TradingView, Bloomberg, Nansen, CryptoQuant, and others; relevant for future automation. |

## Highest-Confidence Product Patterns

The first Product Pattern Library should prioritize:

1. Source transparency.
2. Search-first navigation.
3. Professional density with progressive disclosure.
4. Institutional data trust.
5. Evidence card structure.
6. Research chart narrative.
7. Workspace personalization.
8. Derivatives dashboard clusters.

## Guardrails

High confidence does not mean direct copying.

Every pattern must still pass:

- Evidence First;
- Visual First;
- Progressive Disclosure;
- source/freshness availability;
- human decision authority;
- no fabricated confidence;
- page ownership;
- responsiveness.
