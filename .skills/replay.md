# Replay Rules

Priority:
1. Chart
2. Liquidations
3. OI
4. Funding
5. Orderbook

Orderbook:
- never block Replay
- may fail gracefully

CryptoHFTData:
- CommonOrderbookEvent
- ~4.19M row orderbooks
- full replay exceeds runtime budget
- future: worker + cache
