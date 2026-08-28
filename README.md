# Reversal Review

This repository lets an operator reverse an erroneous transfer on a permissioned ledger recording tokenized security entitlements. The off-chain record — not the chain — is the legal source of truth.

The test suite passes. The implementation is also wrong in several ways.

**Spend under an hour.** Find what is wrong, rank it by severity, and write one test that proves the worst of it. We are not asking you to fix anything.

**How to run:** `npm install`, then `npm start`, open the console URL printed in the terminal. `forge test` runs the suite (from `packages/foundry`).

**The console** is yours to work in — drive the scenarios, watch the reconciliation view, and record findings in the Findings panel as you go. Export when you are done and send us the file.

**What we read for:** whether the problems are ranked rather than listed; whether you separate "this is broken" from "I would have done it differently"; and what you tell us you did not have time to check. That last one carries real weight, so please fill it in honestly.

**Completeness is not scored.** Nobody finds everything in an hour, and you are not expected to. The hour is untimed and self-reported — we are not measuring it.
