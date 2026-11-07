# Progress

Deadline: submit by Sun 8 Nov 2026, 11:00 Dubai (hard limit 12:00).

| # | Milestone | Status |
|---|---|---|
| M0 | Credentials, repo, Vite, tokens, materials, brand jobs, kit, migrations, auth, PWA, deploy | Done. Vercel deploy live at https://altitude-liart.vercel.app. All migrations applied via SQL editor because DATABASE_URL password never reached disk. Seed works over HTTPS |
| M1 | Seed, DrinkArt, menu, item detail, cart, place_order, pricing tests | Done, e2e green |
| M2 | Tracker, barista, meters, tiers, golden path e2e | Done, e2e green |
| M3 | Admin, favorites, popular, offers, Common Hour | Done, e2e green |
| M4 | Squad, clubs, events, reviews, seats, Home | Done, e2e green |
| M5 | Visual polish pass | Done. Screens reviewed at phone and laptop sizes |
| M6 | 3D shield, cup, landing | Done. Golden path passes with 3D on and off |
| M7 |  Drink Lab, wheel, vouchers, mood, pairing, analytics, /demo  | Done |
| M8 | Bug bash, README, final e2e | Done, e2e green |
| M9 | Final deploy and SUBMISSION.md | SUBMISSION.md done. Deployed to https://altitude-liart.vercel.app |
| Extra | Pitch deck .pptx (Team Pythons) | Done: docs/ASCEND-pitch.pptx, rendered in PowerPoint |
| Extra | Owner review pass: removals, barista name and tips, sounds, coffee machine landing | Done. Migration 0008 applied. See DECISIONS.md |
| Extra | Second owner review: checkout items, order history X and last 10, item Back arrow, kept filters, admin header, item-based prep animation | Done. Migrations 0009 and 0010 applied. Orders now reach Ready in 15 seconds for the pitch; set it to 0 in admin settings for a real shift. See DECISIONS.md |

## Waiting on owner
- Photo B (wall)
- Confirm the alternative milk and extra shot charges

## Morning steps for the owner
1. vercel.com > Add New > Project > import `UroojAslamm/altitude`. Framework: Vite.
2. Before deploying, add these Environment Variables, copied from `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEMO_PASSWORD`. Never add the service role key or `DATABASE_URL`.
3. Deploy. Put the URL in `SUBMISSION.md`, then test on a phone.
4. Open `docs/ASCEND-pitch.pptx` and check it.
5. Optional: send Photo B, fix the password in `DATABASE_URL` for future `npm run db:migrate`.
