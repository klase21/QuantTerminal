# Liquidity live display visible fix

Fixed:
- Market Cap / Volume / Dominance were technically using live values but changes were too subtle to notice.
- Increased live pulse multiplier.
- Added visible L{rotationPulse} marker to each metric card.
- Added subtle background pulse to metric cards.
- Added Number(...) guards for base values.

Result:
- You can visually confirm Market Cap / Volume / Dominance are updating.
