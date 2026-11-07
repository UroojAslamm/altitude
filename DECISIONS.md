# Decisions

## Owner decisions (7 Nov 2026, override the PRD where they differ)

- Project lives in `Documents\altitude`. Push straight to `main` after every working slice.
- Hosting: the owner connects GitHub to Vercel. No `VERCEL_TOKEN`.
- Run autonomously after the kickoff questions. Follow PRD priority and cut order.
- Only the owner and Claude push to this repo.
- `allowed_domains` default is `{rit.edu, g.rit.edu, altitude.demo}` (PRD had two). Some RIT students use g.rit.edu.
- New setting `demo_always_open`, default `true` through the event. It bypasses open hours so judges can order at any time. The kill switch (`accepting_orders`) still works. Admin can turn it off.
- Social links: Instagram, Facebook, and Google review, taken from the menu page the owner supplied.
- Logo: trace `docs/brand-reference/logo-source.png` (150x150) and the cup photo to SVG. Same symbol.
- Menu: the owner supplied the real menu at https://scanned.page/p/Vop03v. It replaces the poster items and placeholder prices. It has no sizes, so size and syrup options are gone. Obvious typos on that page are corrected (Manuel to Manual, Hibuscus to Hibiscus). Friday closes at 16:00 there, but settings hold one close time, so the app uses 19:00 and `demo_always_open` covers the event.
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
- The landing cup is modelled on the real double-wall takeaway cup in `docs/brand-reference/photo-d-cup.webp`, at the owner's request. It turns once with scroll.
- Migration 0007 relabels the spin prize as a free light bite, since the real menu has no croissant. The voucher kind stays `free_croissant`.

## Owner review, 7 Nov 2026
These override the PRD.
- Removed from the app: events, Drink Lab, birthday vouchers, pause orders, the barista seat control (and the seat chip on Home, since nothing sets it now), the Loyalty card in admin settings, busiest hours, meters issued, and average prep time. The tables and functions behind them stay in the database, unused, so nothing is lost. Tier and squad numbers are now changed in the database only.
- The Home "Best time to come" card stays. The owner's note was about the analytics tab.
- Common Hour is 12:00 to 13:00. Labels read it from settings.
- `orders.prepared_by_name` is a first-name snapshot of whoever pressed Start, because students cannot read staff profiles. `tip_order` adds one tip per order after that. The checkout tip stays. Meters still exclude tips.
- Sound is on by default and kept per device. It can be changed in Me, on the Barista screen, and in admin settings.
- The ready pop-up is global in `AppShell`, so it shows on any screen. The tracker keeps its full-screen panel.
- `public_social_links()` gives the signed-out landing page Facebook, Instagram, and Google review links without opening `settings` to anon.
- "Staff button": the owner's wording. The demo login now has Try as Student and Try as Staff, and Staff opens Barista and Admin. Admins also get an Admin button on the Counter.
- The landing opens on a procedural espresso machine in `src/three/Machine.tsx`. Beans are a function of scroll, so nothing loops. The cup turns once during the pour.
- Clubs are removed from the app at the owner's request: the page, the Home link, and the landing line. The tables and the `clublead` demo account stay, unused.
- `watchForAppUpdates` reloads the page when a new service worker takes over. Without it, `registerSW.js` only registers the worker, so returning browsers kept showing the old build.
- The order tracker no longer uses the 3D cup (F17). The owner asked for the visual to match the item, so `PrepVisual` draws it in 2D: the drink fills over 180 seconds from the barista's start, stops at 92 percent until Ready, and food appears from the bottom up. On a mixed order it shows the first drink. The queue of small cups went with the 3D cup; the queue line above still gives the count.
- The pour, surface, and steam loop only while an order is being prepared. They show progress, so the rule against looping decorative animation does not apply. Reduced motion stops them.
- The X on order history sets `orders.hidden_at` through `hide_order`. Nothing is deleted, so analytics, meters, and barista records are unchanged. Only completed and cancelled orders can be hidden. The list shows the last 10 visible orders.
- Menu search, category, and filters are kept in memory until the page reloads, so they survive opening an item and returning.
- "Counter" is now "Barista" on the staff screens. "Student view" is gone from the admin header. Students still pick up "at the counter", which is the physical place.
