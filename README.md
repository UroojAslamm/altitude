# ASCEND by Altitude

Order-ahead and loyalty app for Altitude, the cafe at RIT Dubai. Students order ahead, watch a live queue, get a ready alert, and earn meters that raise them from Base Camp to Peak. Baristas run the counter from a live dashboard. Managers edit the menu and promos and see what sells.

Built by Team Pythons for ideaForge (AIRC x Altitude).

## 60-second setup

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Database changes: `npm run db:migrate` applies `supabase/migrations` (needs `DATABASE_URL`). `npm run seed` loads demo data (needs `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD`). It is safe to re-run.

Checks: `npm run typecheck`, `npm run test`, `npm run build`, `npm run e2e`.

## Demo accounts

All use `@altitude.demo` and the password in `DEMO_PASSWORD`. The login screen also has one-tap demo buttons.

| Account | Role | Tier |
|---|---|---|
| `student1` | Student | Base Camp |
| `student2` | Student, squad with `student3` | Ridge |
| `student3` | Student | Summit |
| `student4` | Student | Peak |
| `barista` | Barista | |
| `admin` | Admin, also `/demo` pitch controls | |
| `clublead` | Club lead, AIRC | |

**Remove or rotate these accounts after the event.** The demo password ships in the client bundle so the buttons work, so anyone can use them while the demo is live.

## What is real and what is demo

- **Demo payment:** `MockPaymentProvider` always succeeds. No card is charged. `MobiposPaymentProvider` is a documented stub, built to plug into MOBIPOS. It is not integrated.
- **Demo data:** about 2,000 seeded orders (`is_seed = true`). Popular picks, pairing percentages, and busy times are computed from real rows, seeded plus live.
- **Placeholder prices:** every menu price is a placeholder until the cafe confirms it. Admin shows a tag.
- **Recommendation engine:** deterministic rules plus current Dubai weather. No LLM.
- **Always open:** `demo_always_open` is on during the event so judges can order at any time. Turn it off in Admin, Settings.

## Rollout plan

- Free tiers keep running costs near zero.
- Works on any phone and the existing counter laptop. Installable as a PWA.
- MOBIPOS adapter is ready for the vendor's API, an estimated 1-2 day task.
- Before launch: turn on email verification, add Web Push, remove demo accounts, confirm prices.
- Barista training is one screen.

## Stack

Vite, React 18, TypeScript, Tailwind, TanStack Query, Zustand, Supabase (Postgres, Auth, Realtime, RLS), three.js with React Three Fiber, Vercel. All pricing, discount, meter, and status rules live in database functions.
