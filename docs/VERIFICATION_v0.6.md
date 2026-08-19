# v0.6 Verification Record

## Passed in this build environment

- Shell syntax for all project scripts.
- Python compile for Android configurator.
- JSON parsing.
- Contiguous migration numbering 001–010.
- Static RLS/signing/append-only/security invariants.
- Android native patcher idempotency smoke test.
- TypeScript/TSX syntax scan (TS1xxx parser errors).
- Clinician-safety source invariants.
- Pure TypeScript business-logic stress suite (`PURE_LOGIC_TESTS_PASS=10`).
- ZIP archive integrity after packaging.

## Important defects found/fixed during v0.6

1. The v0.5 archive had an empty `native/` directory; hardened scanner/speech Java sources were restored from v0.4.
2. QA/manager Postgres enum values were initially added and used in one transactional migration; split into 009 + 010 so PostgreSQL can safely commit new enum values first.
3. A signature-attestation table alone did not prevent direct status flips; runtime signing fields are now restricted and `finalize_clinical_note()` atomically finalizes + hashes + attests.
4. The security-definer signer initially needed explicit tenant/user-session binding; it now checks both `app.current_agency_id` and `app.current_user_id`.
5. Runtime INSERT can no longer create a note already marked signed; notes are born as drafts.

## Not executable in this sandbox

`npm install` timed out against the package registry, so dependency-aware `npm run typecheck`, Vitest, Vite production build, and API build could not be completed here. Docker/Postgres and the Android SDK/Gradle runtime are also unavailable, so `npm run verify:full` and `npm run android:test` remain first-run gates on a normal development machine.
