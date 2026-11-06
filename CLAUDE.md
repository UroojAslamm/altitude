# ASCEND: working rules

Source of truth: `PRD.md`. Overrides from the owner: `DECISIONS.md`. Resume point: `PROGRESS.md`.

1. Read `PRD.md` and `PROGRESS.md` at the start of every session. Never ask the user design questions.
2. TypeScript strict; no `any` unless commented. Zod-validate external input.
3. All pricing, discount, meter, and status rules live in database functions. The client displays results. Never trust client-sent prices or roles.
4. Money is integer fils. Time is `timestamptz`, shown in Asia/Dubai.
5. Every table has RLS. The service role key and `DATABASE_URL` never reach the client bundle.
6. Every data screen has loading, empty, and error states.
7. Use the materials and components from PRD Section 4 everywhere. No flat matte one-off styling. No emoji in the UI. No looping decorative animation.
8. 3D lives in `src/three/`, lazy loaded, ErrorBoundary, 2D fallback. Do not start 3D until P0 and P1 tests are green.
9. No libraries beyond PRD Section 5 without a reason written in `DECISIONS.md`. No features outside the PRD. No refactoring working code without cause.
10. Never invent social URLs, student data, or a different logo symbol. Prices are marked placeholders.
11. Run typecheck, test, and build before every commit; commit after every working slice; update `PROGRESS.md`; push to `main`.
12. Keep context small: read only what you need, summarize errors, no giant logs.
13. Do not wait for approval between milestones.
