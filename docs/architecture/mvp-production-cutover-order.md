# Production Cutover Order

The certified order is:

1. Prepare and smoke a non-Production Vercel deployment using the proposed corpus/checksum pins.
2. Recheck the frozen MVP-8P database, pin, deployment, and health baseline.
3. Run guarded activation dry-run, then one guarded activation transaction.
4. Promote the already-smoked deployment and its exact pins to Production.
5. Verify database selection, pins, deployment, health, and all mandatory readers for the frozen observation window.

No raw exposure insert is an operator workflow. A deployment is never promoted before its candidate reads pass.
