# Macro 401 fix applied to latest liquidity branch

Problem:
- Latest liquidity branch was based on a zip before the macro 401 fallback fix.
- Yahoo Finance returns 401, causing a noisy MACRO API ERROR stack trace.
- Route still returned 200 through fallback, but terminal was noisy.

Fixed:
- Yahoo non-200 returns [] instead of throwing.
- CoinGecko non-200 returns null instead of throwing.
- GET wraps both live fetches with safe catch.
- Final API catch downgraded to console.warn fallback message.

Result:
- /api/macro keeps returning fallback data.
- No large MACRO API ERROR stack trace from Yahoo 401.
