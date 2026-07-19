# Production Rollback Order

Rollback reverses the cross-system transition without mutating history:

1. Restore the frozen rollback deployment and corpus/checksum pins.
2. Execute the guarded rollback transaction, appending a new exposure for the exact predecessor corpus and a rollback event linked to activation.
3. Verify old corpus selection, pin/deployment identity, public health, Dashboard, Scanner, Trade for six symbols, and Replay for six symbols.

The original, activation, and rollback exposure rows remain durable. Neither corpus is deleted.
