# Pooled Read-Only Serving

Neon application traffic uses PgBouncer transaction pooling. Session settings observed between transactions are not treated as security invariants.

Every managed Serving read is executed through `MvpServingPostgresClient.readOnlyTransaction`:

1. Begin an explicit `READ ONLY` transaction.
2. Verify `current_user = mvp_serving_reader`.
3. Verify `current_database() = neondb`.
4. Verify `transaction_read_only = on` inside that transaction.
5. Execute the complete logical read through the transaction handle.
6. Commit on success or roll back on error.

The database role remains SELECT-only. The wrapper rejects non-reader clients and does not expose its transaction handle outside the bounded callback.
