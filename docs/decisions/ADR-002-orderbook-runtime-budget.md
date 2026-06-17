# ADR-002 Replay Orderbook Runtime Budget

Decision:
Do not reconstruct full orderbook in request path.

Reason:
~4.19M row replay exceeds runtime budget.

Future:
Worker + cache architecture.
