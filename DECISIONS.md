# Decisions

## Owner decisions (7 Nov 2026, override the PRD where they differ)

- Project lives in `Documents\altitude`. Push straight to `main` after every working slice.
- Hosting: the owner connects GitHub to Vercel. No `VERCEL_TOKEN`.
- Run autonomously after the kickoff questions. Follow PRD priority and cut order.
- Only the owner and Claude push to this repo.
- `allowed_domains` default is `{rit.edu, g.rit.edu, altitude.demo}` (PRD had two). Some RIT students use g.rit.edu.
- New setting `demo_always_open`, default `true` through the event. It bypasses open hours so judges can order at any time. The kill switch (`accepting_orders`) still works. Admin can turn it off.
- Social links stay empty and hidden until real URLs are added in admin.
- Logo: trace `docs/brand-reference/logo-source.png` (150x150) and the cup photo to SVG. Same symbol.
- Menu: transcribe the poster, mark unclear items `needs_review`, use placeholder prices.
- The owner will send the "Elevate your experiences" wall photo (Photo B). Until then use crops of the lounge photo.
- Pitch deck: build a `.pptx` from the PRD pitch outline with real screenshots, after M8. Team name: Team Pythons.

## Build decisions

- Migrations 0001 to 0006 were applied through the Supabase SQL editor because `DATABASE_URL` still held a placeholder. They are recorded in `private.schema_migrations`, so `npm run db:migrate` skips them.
- `.env.production` is not committed. Vercel env vars hold the client values.

- Logo: the symbol traced well, but the 150px wordmark came out blobby. `Logo` uses the traced symbol with a typeset Barlow Condensed wordmark.
- `VITE_DEMO_PASSWORD` added for the demo login buttons. It is public in the bundle by design. Rotate after the event.
- `orders.customer_name`, `reviews.author_name`, `drink_submissions.author_name` snapshots keep names readable without opening `profiles` RLS.
- Barista writes go through RPCs (`set_item_available`, `set_seat_status`, `set_accepting_orders`).
- `orders.free_shot_fils` records the free extra shot so the receipt can show it.
