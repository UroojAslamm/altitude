# PRD: ASCEND, the Altitude Cafe App

**Event:** ideaForge Hackathon (AIRC x Altitude) | **Submit:** Sun 8 Nov 2026, 12:00 PM Dubai | **Pitch:** Mon 9 Nov, 12-1 PM (3 min pitch + 2 min Q&A, top 7 teams)
**Client:** Altitude, the cafe in the RIT Dubai cafeteria. Slogan: "Elevate your experiences."
**Builder:** Claude Code on a Claude Pro plan (usage is limited and resets in rolling windows).

---

## 0. READ THIS FIRST: how Claude Code must run this project

This file is the **single source of truth**. The user will not paste prompts or answer design questions. The user only provides (a) the reference pictures and (b) a few account values listed in 0.2. Everything else is decided here. If something is unclear, choose the smallest reasonable option, record it in `DECISIONS.md`, and continue.

### 0.1 Autonomous execution protocol
1. Read this whole file once. Then create `CLAUDE.md` yourself containing Section 17 (Working Rules) and a pointer to `PRD.md`.
2. Create `PROGRESS.md` (checklist of milestones M0-M9 from Section 16 with status). **Update it after every milestone and every commit.** Usage limits can interrupt you at any time. When a session starts, read `PROGRESS.md` first and resume exactly where it stopped. Do not redo finished work.
3. **Run milestone after milestone without waiting for approval.** Stop only for: a missing credential (0.2), a failing test you cannot fix after 3 focused attempts (write the blocker to `PROGRESS.md` and move to the next independent task), or when the usage limit is hit.
4. Before each commit run `npm run typecheck && npm run test && npm run build`. Run `npm run e2e` at the end of M2, M4, M6, M8. Fix what breaks. Never commit a broken build.
5. Keep context small (limited plan): read only files you need, never paste large logs, summarize errors in one line, prefer `grep` over reading whole files.
6. At the end of each milestone print three lines only: built / how to test / deferred.

### 0.2 One-time human inputs (ask for these once, in a single message, at the very start, and only if missing)
Check `.env.local` first. If any value is missing, send **one** message asking for all of them:
1. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase project > Settings > API).
2. `DATABASE_URL` (Supabase > Settings > Database > Connection string, URI, transaction pooler or direct). Migrations and seed run through this with a Node script (`npm run db:migrate`), so the Supabase CLI login is not needed.
3. A reminder: **Supabase > Authentication > Providers > Email > turn OFF "Confirm email"** (needed because free-tier email sending is rate-limited and would break demos).
4. Optional but strongly recommended: `VERCEL_TOKEN` (or say "I will connect GitHub to Vercel myself"). If neither is available, still build everything and document local run steps in the README.
Then continue immediately. Do not ask anything else.

### 0.3 Reference pictures
The user sends four photos of the cafe (attached in the session, or placed in `/docs/brand-reference/`; if attached only, save them there). Identify each by looking at it:
- **Photo A (counter):** coffee grinders, smoothie and milkshake menu poster ("100% Real Fruit & Veggie Smoothies" with six smoothies and three milkshakes), maroon "Special this week" card with a tiramisu cartoon, glowing shield logo on an oak wall panel.
- **Photo B (wall):** beige wall with backlit lettering "Elevate your experiences", students studying, oak chairs.
- **Photo C (lounge):** curved black-and-warm-white ring lights on the ceiling, shield logo, students at tables, espresso machine in front.
- **Photo D (cup):** white double-wall paper cup under an espresso machine, with the **navy Altitude logo** (wordmark "ALTITUDE" over a chain-link/peak symbol).

Reference-picture jobs (do these in M0, automatically):
1. **Look at every picture** and write `docs/DESIGN_NOTES.md`: the palette you see, materials (oak, brass, chrome, black metal, cream plaster), lighting (warm backlit glow), and the mood. Use it to check the design later.
2. **Palette check:** sample dominant colors from the pictures with a Node script (`sharp` plus simple k-means, or `node-vibrant`). Compare with the token table in 4.1. Keep the table unless a sampled color is clearly more accurate, then adjust that token by up to 10% and note it in `DECISIONS.md`.
3. **Logo:** crop the navy logo from Photo D (square crop around the symbol and the word "ALTITUDE"), remove the background to transparent, and vectorize with the `potrace` npm package to `public/brand/logo.svg`. Also produce `logo-cream.svg` (recolored fill `#FBF7EF`) for dark backgrounds, and a `logo-mark.svg` (symbol only) for favicon and PWA icons (192 and 512 PNG via `sharp`). If tracing looks poor on inspection, fall back to a clean typographic wordmark "ALTITUDE" in Barlow Condensed, and note it in `DECISIONS.md`. Never invent a different symbol.
4. **Photos in the UI:** optimize all four pictures with `sharp` into AVIF/WebP at widths 480, 960, 1600 (`public/brand/photos/`) with blur placeholders. Use them as tinted hero backdrops and ambient imagery (see Section 4.5).
5. **Menu from Photo A:** read the smoothie and milkshake poster closely and transcribe the real item names and ingredients into the seed (Section 14). Where text is unreadable, use a sensible name and mark the item `needs_review = true` (visible only to admin).

---

## 1. Product in one paragraph

ASCEND is a premium web app (installable PWA) for phones and laptops that lets RIT Dubai students order from Altitude ahead of time, watch a live queue, get alerted when the order is ready, and earn "meters" that raise them through loyalty tiers: Base Camp, Ridge, Summit, Peak. Baristas run the counter from a live dashboard. Managers edit the menu, promos, and see what sells. Around the core sit social features (Squads, Club Summit, Drink Lab, rewards) and a refined 3D layer. The visual identity is a **glossy, premium "obsidian and brass" look** drawn from the cafe's black fixtures, backlit amber signs, oak wood, and chrome espresso machines.

## 2. Goals, judging rubric, non-goals

Judges score 100: Solution Fit 25, Innovation 20, Technical Execution 20, Design & Experience 20, Pitch & Feasibility 15.

| Rubric | What we must show |
|---|---|
| Solution Fit (25) | All six brief items work: loyalty, order and queue, popular picks, promo spotlight, club and event hub, online payment (adapter). Built around real staff workflow. |
| Innovation (20) | Climb metaphor, Squad social loyalty, Community Drink Lab, mood and weather picker, pairing from real order data. |
| Technical (20) | Working realtime prototype, server-side rules (RLS, atomic order numbers, idempotent meters), automated tests. |
| Design (20) | A polished, glossy, premium interface that matches the cafe (Section 4). Refined 3D. Flawless on phone and laptop. |
| Pitch (15) | Live phone + barista-laptop demo, honest rollout story, near-zero cost. |

**Non-goals (do NOT build):** real MOBIPOS integration, real card processing, native apps, seat reservation (roadmap), AR, collectibles, Arabic/RTL, Web Push, chat, group cart.

**Success:** a judge can sign up, order, watch the queue move, get the ready alert, and see meters and tier update, with zero errors, on a phone and a laptop, in an interface that looks like a funded product.

## 3. Users and roles

| Role | Device | Can do |
|---|---|---|
| `student` | Phone mostly | Browse, order, track, earn meters, squads, clubs, RSVP, Drink Lab, reviews, rewards |
| `club_lead` | Phone/laptop | Student powers plus create events for their club (admin approval needed) |
| `barista` | Counter laptop/tablet | Live orders, advance, undo, cancel, picked up, sold-out toggles, seat status, kill switch |
| `admin` | Laptop | Barista powers plus menu, promos, announcements, drink of the month, event approval, moderation, analytics, settings |

Roles live in `profiles.role`. A user can never change their own role (RLS plus column privileges). Barista, admin, club_lead accounts are created by the seed script only.

## 4. Visual design system: "Obsidian & Brass" (professional, shiny, not cartoonish)

**Direction:** premium and polished, like a luxury coffee brand's app. Glossy surfaces, real depth, metallic brass details, glass panels over rich photography, crisp typography. **Not matte and flat. Not playful. Not "animated".** Think glass, chrome, brass, lacquer.

### 4.1 Color tokens (`src/styles/tokens.css`, mirrored in the Tailwind theme)

| Token | Hex | Role |
|---|---|---|
| `--ink-950` | `#0B0908` | Deepest background |
| `--ink-900` | `#14110F` | App background (black fixtures) |
| `--ink-800` | `#1E1A17` | Raised surfaces |
| `--ink-700` | `#2A2420` | Borders on dark, inputs |
| `--cream-50` | `#FBF7EF` | Primary text on dark, pearl panels |
| `--cream-100` | `#F3EBDD` | Secondary text, wall color |
| `--cream-300` | `#CDBFA6` | Muted text |
| `--oak-400` | `#C99A5B` | Wood accent, Base Camp |
| `--oak-600` | `#A67840` | Pressed wood |
| `--glow-300` | `#FFD58A` | Backlight highlight |
| `--glow-500` | `#F5B14A` | Brass main, primary actions |
| `--brass-700` | `#9A6B24` | Brass shadow |
| `--navy-500` | `#3A4BB0` | Logo blue (brighter on dark), links, Ridge |
| `--navy-700` | `#2E3C93` | Logo blue base |
| `--maroon-700` | `#6B1B26` | Special / Drink of the Month |
| `--berry-500` | `#E04B55` | Error, sold out |
| `--mango-400` | `#F4B63F` | Warning, stars |
| `--leaf-500` | `#5E9B45` | Success, available |

Text on `--ink-*` is `--cream-50` (primary) and `--cream-300` (secondary). Never use `--glow-*` as text on light panels. Verify WCAG AA for all text pairs with a small contrast test script run in `npm run test`.

### 4.2 Shiny materials (implement as reusable CSS classes and components)
Build these once in `src/styles/materials.css` and use them everywhere so the whole app feels consistent:
- **`.surface-obsidian`:** page and card base. `background: radial-gradient(1200px 600px at 10% -10%, rgba(245,177,74,.14), transparent 60%), radial-gradient(900px 500px at 100% 110%, rgba(58,75,176,.16), transparent 60%), linear-gradient(180deg,#14110F,#0B0908);` plus a 3%-opacity film-grain overlay (inline SVG `feTurbulence` data URI, `mix-blend-mode: overlay`). The grain prevents dead flat banding.
- **`.glass`:** frosted panels. `background: linear-gradient(180deg, rgba(255,247,232,.10), rgba(255,247,232,.03)); border: 1px solid rgba(255,230,180,.16); backdrop-filter: blur(18px) saturate(140%); box-shadow: inset 0 1px 0 rgba(255,255,255,.20), inset 0 -1px 0 rgba(0,0,0,.35), 0 24px 48px -24px rgba(0,0,0,.75);`
- **`.gloss`:** adds a specular highlight on top. `::before` with `linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 45%)` clipped to the top half and a thin diagonal glint `linear-gradient(115deg, transparent 38%, rgba(255,255,255,.10) 50%, transparent 62%)`. Static. On desktop hover only, shift the glint over 400 ms.
- **`.brass`:** metallic brass fill. `background: linear-gradient(135deg,#8A6A2F 0%,#E9C46A 28%,#FFF1C9 46%,#D9A441 62%,#8A6A2F 100%)`. Used for tier badges, key dividers, icon rings, chart lines, and the primary button edge.
- **`.btn-primary`:** lacquered brass button. `background: linear-gradient(180deg,#FFE3A3 0%,#F5B14A 55%,#C9812A 100%); color:#14110F; box-shadow: inset 0 1px 0 rgba(255,255,255,.65), inset 0 -2px 0 rgba(0,0,0,.18), 0 10px 24px -10px rgba(245,177,74,.7);` Pressed state: slightly darker, shadow reduced.
- **`.btn-secondary`:** `.glass` with cream text. **`.btn-ghost`:** text only with an underline hairline on hover.
- **Hairline gradient borders** on feature cards (1px, `rgba(255,230,180,.55)` fading to `rgba(255,230,180,.05)`) using the CSS mask technique.
- **Elevation:** three shadow levels (`e1`, `e2`, `e3`), always paired with an inner top highlight so surfaces look like lacquered or glass objects.
- **Heading style:** H1 and H2 use Barlow Condensed 700 uppercase with a subtle cream-to-glow vertical text gradient (H1 only). Numbers use tabular figures.
- **Shield motif:** tier badges and hero cards use a shield-shaped `clip-path` echoing the logo, filled with metal gradients (below).
- **Tier metals:** Base Camp = oak/bronze gradient. Ridge = brushed steel with navy tint. Summit = polished gold (`.brass`). Peak = obsidian with a bright gold rim and a soft glow. Each badge has a specular highlight.
- **Backlight glow:** the Ready card, tier badge, and logo get a warm halo (`box-shadow: 0 0 36px rgba(255,213,138,.45)`), echoing the cafe's backlit signs. Static, not pulsing.

If `backdrop-filter` is unsupported, or the device is low-end (`hardwareConcurrency < 4`) or the user prefers reduced transparency, fall back to opaque `--ink-800` panels with the same borders and highlights. Never nest more than two blurred layers.

### 4.3 Typography and icons
Headings: **Barlow Condensed 700**, uppercase, `letter-spacing: .04em` (echoes the logo lettering). Body: **Inter** (400, 500, 600). Self-host with `@fontsource` (no external CDN). Body size 16px or larger (stops iOS input zoom). Icons: `lucide-react` only, 1.75 stroke, consistent 20/24px sizes. No emoji in the UI.

### 4.4 Motion: restrained and professional (this is NOT an animated-looking app)
- **Allowed:** 150-250 ms fades and slides for page and sheet transitions, button press feedback (scale .98), status crossfades, number count-up on meters (once, 600 ms), skeleton loading shimmer, and scroll-controlled or drag-controlled 3D.
- **Banned:** bouncing, wobbling, floating elements, endless pulsing or looping decorative animation, confetti, auto-playing carousels, parallax jitter, spinning logos.
- The READY alert glows once and then stays static. The reward wheel spins only after a user tap and settles in 1.8 s.
- Respect `prefers-reduced-motion` (disable all but opacity changes).

### 4.5 Photography and imagery
- Use the four cafe photos as **rich backdrops**: landing hero, Home header, Menu header, empty states, login screen. Always apply a dark warm gradient scrim (`linear-gradient(180deg, rgba(11,9,8,.35), rgba(11,9,8,.85))`) plus slight blur on the lower region so text stays legible. Crop intentionally (the glowing shield and the "Elevate your experiences" sign are the best crops).
- **Drink artwork (no product photos exist):** build a `DrinkArt` SVG component that renders each item as a polished, glossy vector illustration with realistic gradients, specular streaks, and soft reflections: hot paper cup with the navy Altitude mark, iced glass with cubes and straw, tall smoothie glass with a fruit-color gradient and garnish, milkshake glass with cream top, croissant, tiramisu slice. Color comes from the item's `accent_color`. Static, high quality, consistent lighting direction (top-left). If an admin sets `image_url`, show that photo instead with the same frame.
- Item cards sit on `.glass` with a colored radial glow behind the art that matches the drink.

### 4.6 Layout
Phone-first with a floating glass bottom tab bar (Home, Menu, Orders, Squad, Me). At >= 1024px the tab bar becomes a left sidebar and content uses two columns. Barista and admin are laptop-first. Tap targets >= 44px. Use `dvh`, `env(safe-area-inset-*)`. Max content width 1200px on desktop, centered.

### 4.7 Component kit (build first, use everywhere)
Button (primary, secondary, ghost, icon), Card (glass, photo, feature), TierShield, Stat, ProgressRing, Chip, Segmented, Slider (price range), Sheet (bottom sheet on phone, side panel on desktop), Modal, Tabs, Toast, Skeleton, EmptyState, Stepper, Field (input, textarea with counter), Rating, Badge, ConnectionDot, DrinkArt. Document each in a hidden `/kit` page (admin only) so the team can review the look quickly.

## 5. Tech stack (fixed, do not swap)

- **Frontend:** Vite + React 18 + TypeScript (strict) + Tailwind CSS + React Router + TanStack Query + Zustand (cart) + Zod + lucide-react. Use CSS transitions and a small amount of Framer Motion for sheets and page fades only.
- **3D:** three + @react-three/fiber + @react-three/drei, lazy loaded in a separate chunk. All geometry procedural (Lathe for cup, extruded shapes, displaced plane meshes for mountains). **Reflections come from a procedural environment built with drei `<Environment>` and `<Lightformer>` children (no downloaded HDR files, so it works offline and loads fast).** Materials: `MeshPhysicalMaterial` with `clearcoat`, `metalness`, `roughness`. Use `transmission` for glass only on desktop.
- **Scroll:** Lenis; landing progress read from `window.scrollY` over a tall container with a sticky canvas. No drei `ScrollControls`.
- **Backend:** Supabase (Postgres, Auth, Realtime, RLS, RPC). Migrations are plain `.sql` files in `/supabase/migrations`, applied by `scripts/migrate.mjs` using `pg` and `DATABASE_URL`. Realtime enabled in migrations with `alter publication supabase_realtime add table ...` for `orders`, `menu_items`, `settings`.
- **Hosting:** Vercel if a token is available.
- **PWA:** `vite-plugin-pwa`, installable, friendly offline screen, never cache order or auth API calls.
- **Images:** `sharp`, `potrace` (dev scripts only).
- **Tests:** Vitest, Playwright (`npx playwright install chromium`).
- **Optional (P3, off by default):** Edge Function with the Claude API for the mood picker behind `VITE_AI_ENABLED`.

Env vars (document in `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` (scripts only, never in client bundles), `VITE_DEMO_LOGIN` (default `true` until the event ends), `VITE_3D_ENABLED` (default `true`), `VITE_AI_ENABLED` (default `false`), `DEMO_PASSWORD` (seed).

## 6. Decisions on every ambiguity (final)

The team brainstormed several overlapping versions of these ideas. These decisions override conflicts.

1. **Meters:** 1 meter per 1 AED of the order total after discounts, excluding tip, rounded down. Meters never decrease and are never spent. Tier uses lifetime meters.
2. **Tier thresholds** (admin-editable): Base Camp 0, Ridge 300, Summit 800, Peak 1600.
3. **Tier perks:** Base Camp: earns meters, one spin ticket per 5 completed orders. Ridge: one **free extra shot** per order, early look at Drink of the Month. Summit: Ridge perks plus **5% off** every order. Peak: Summit perks but **10% off** (replaces the 5%), plus one **free drink voucher each month**.
4. **Discounts never stack.** Each order gets the single best of: tier percent, active promo, applied voucher, squad L3 percent. The free extra shot perk is an add-on and does stack. Prices are always computed on the server.
5. **Squad bonus (10%, resolves the 10% vs 25% conflict):** when a member's order completes, the buyer gets 100% of the meters. Every **other** squad member gets +10% of that amount (rounded down) added to their **personal** meters, so friends really help each other climb. The squad's shared total increases by the buyer's full meters. Cap: 50 bonus meters per member per day.
6. **Squad levels:** L1 at 0, L2 at 500, L3 at 1500 squad meters. L2: free extra shot on Fridays (still one free shot per order). L3: 5% off for members (a discount candidate under rule 4).
7. **Squad size:** 2 to 6, one squad per user, joined by a 6-character code. Creator can remove members. Anyone can leave.
8. **Order lifecycle:** `placed` -> `preparing` -> `ready` -> `completed`, or `cancelled`. Meters are awarded **only when `completed`**, exactly once. `completed` is final. Undo works for `preparing`->`placed` and `ready`->`preparing` only.
9. **Completing:** barista taps "Picked up" or the student taps "I got it" on the ready screen. Both call the same function. Ready orders older than 15 minutes turn amber on the barista screen.
10. **Fulfillment:** pickup at the counter only, with a "Dine in / Take away" toggle (tells the barista which cup). Seat reservation is roadmap. Instead, the barista sets **seat availability** (Plenty / Few / Full), shown to students.
11. **Payment (honest):** (a) **Demo card payment** via a `PaymentAdapter` interface with `MockPaymentProvider` (always succeeds after 1 s, labeled "Demo payment" on screen); (b) **Pay at pickup**. Both enter the queue immediately; unpaid shows a badge on the barista screen. `MobiposPaymentProvider` is a documented stub that throws `NotImplemented`. Pitch wording: "built to plug into MOBIPOS", never "integrated".
12. **Money:** integer **fils** (1 AED = 100 fils). Never floats.
13. **Tipping:** 0, 2, 5, 10 AED or custom (max 100), stored as `tip_fils`. No meters on tips.
14. **Login:** email + password. Allowed email domains are stored in `settings.allowed_domains` (default `{rit.edu, altitude.demo}`, admin-editable) and enforced in the signup form **and** by a database trigger on `auth.users`. Email confirmation is off (0.2 step 3). Production would turn it on (say so in the pitch). Demo login buttons ("Try as Student / Barista / Admin") show on the login screen when `VITE_DEMO_LOGIN=true`.
15. **"Smart" features are deterministic rules and real order statistics in the MVP.** No external API unless `VITE_AI_ENABLED=true`, with rules as fallback. Pitch wording: "recommendation engine".
16. **Seeded data is demo data** (`is_seed = true`). Popular picks, pairing %, and busy-time are computed from real rows (seeded plus real). README says so.
17. **Timezone:** all schedule logic (open hours, Common Hour, Fridays, birthdays, "today" for order numbers, club month) uses `Asia/Dubai`. Store `timestamptz`.
18. **Allergens:** dietary tags are shown as preferences. Show "Ask our staff about allergens" on item detail and checkout. Never promise allergen-free.
19. **Privacy:** collect only name, email, optional birth month and day (no year), orders, reviews.
20. **3D never blocks function.** If WebGL is missing, the device is weak, reduced motion is on, or the 3D chunk fails, use the 2D fallback. Ordering must work with `VITE_3D_ENABLED=false`.

## 7. Feature list and priority

**P0 MUST (perfect before anything else)**
F1 Auth, roles, profile. F2 Menu, item detail, options, filters. F3 Cart and checkout (preferences note, tip, demo pay or pay at pickup). F4 Live tracking, queue position, ETA, ready alert. F5 Barista dashboard. F6 Meters, tiers, perks, history, 2D ring. F7 Admin: menu edit, availability, kill switch, drink of the month, promos.

**P1 SHOULD**
F8 Favorites ("star my usual") and one-tap reorder. F9 Popular picks and busy-time chart. F10 Discounts tab, promo spotlight, announcements and exam-week pop-ups. F11 Common Hour (happy hour) 2x meters. F12 Squad. F13 Clubs, leaderboard, events with RSVP. F14 Reviews. F15 Seat status and social follow links.

**P2 WOW**
F16 3D landing "The Ascent". F17 3D cup tracker. F18 3D tier shield. F19 Drink Lab. F20 Reward wheel, vouchers, Birthday Mystery Cup. F21 Mood picker, weather suggestion, pairing. F22 Admin analytics.

**P3 roadmap (slide only):** group cart, seat reservation, Web Push, real MOBIPOS, LLM mood picker, Arabic/RTL, AR.

## 8. Screens and behavior

Routes: `/` (landing if logged out, Home if logged in), `/login`, `/signup`, `/menu`, `/menu/:itemId`, `/cart`, `/checkout`, `/orders`, `/orders/:orderId`, `/squad`, `/clubs`, `/events`, `/lab`, `/offers`, `/me`, `/barista`, `/admin`, `/demo` (admin), `/kit` (admin).

**Landing (logged out):** see F16. CTA "Start climbing" -> `/signup`, "Log in". Slogan "Elevate your experiences". Three feature blocks (Order ahead, Climb tiers, Squad up) on `.glass` cards over photography.

**Login/Signup:** full-bleed Photo C backdrop with scrim, centered glass form, logo above. Demo buttons beneath when enabled. Friendly domain error: "Use your RIT email".

**Home:** (1) header over Photo B with greeting, tier shield, and the Summit ring with "260 m to Ridge". (2) Active order card (live status, queue position, ETA). (3) Announcement banner if active. (4) **Drink of the Month** hero card in maroon with brass trim, DrinkArt, price, "Try it". (5) Pairing line "X% of students who order this add a Butter Croissant" (only with >= 5 supporting orders). (6) Seat availability pill and Common Hour badge with countdown. (7) Popular now (top 5, last 14 days). (8) Your usual. (9) Busy-time card "Best time to come: 10:40 (~2 min wait)". (10) Upcoming events (3). (11) Footer with social icons from `settings.social_links` (hide empty ones, never invent URLs).

**Menu:** header over Photo A. Sticky category chips, search. **Filters sheet:** dietary tags (dairy-free, low-sugar, vegan, caffeine-free), caffeine level, **price range slider**, hot/iced, with a count badge and Clear all. **Mood picker** button (F21). Item card: DrinkArt, name, short description, price from, rating, tag chips, sold-out overlay (cannot add), favorite star. **Item detail:** option groups (size, milk, extra shot, syrup, sugar, temperature), live price, quantity, Add to cart, reviews, allergen note. Required groups must be chosen first.

**Cart:** line items with options, edit/remove, steppers, subtotal. Banner if an item became unavailable or a price changed (revalidated on open and at checkout).

**Checkout:** summary with a discount line explaining which discount applied ("Summit member 5%"); **Preferences textbox** (140 chars, counter, placeholder "e.g. extra hot, room temperature"); Dine in / Take away; voucher picker (one); tip selector; payment method (Demo card or Pay at pickup); estimated ready time; Place order button disabled while submitting. If closed or not accepting orders, show a clear message and disable. Success -> tracker.

**Tracker `/orders/:id` and Orders list:** status stepper (Placed, Preparing, Ready, Picked up); "3 ahead of you, about 4 min", live. **Ready state:** full-screen obsidian panel with a brass-lit "READY, Order #27", chime, vibration where supported, tab title "READY #27", "I got it" button. Cancel only while `placed`. After completion: meters earned with breakdown (base, Common Hour 2x, squad), new total, tier-up moment (metal badge swap, one-time glow), "Rate your drink". 3D cup (F17) when available, polished SVG cup otherwise.

**Squad:** create or join by code; members with meters; squad meter bar with L1/L2/L3 markers and unlocked perks; copy invite code; leave. Empty state explains the benefit.

**Clubs:** list, join/leave (max 3), **Club Summit leaderboard** (meters members earned this calendar month in Dubai time), top 3 in gold/steel/bronze plates.

**Events:** approved upcoming events with club, date, place, RSVP toggle and count. Club leads get "Create event" (status `pending`).

**Drink Lab:** this month's submissions with vote buttons (one vote each, not your own). Submit form: name (40), description (200), base item, ingredients. One submission per user per month. Admin can promote a winner to the menu.

**Me:** profile, optional birth month/day, tier details and perks, order history, rewards, favorites, logout.

**Rewards (F20):** one spin ticket per 5 completed orders. The database picks the prize (weighted): +25 meters 35%, free extra shot 25%, 10% off 20%, free croissant 10%, try again 9%, free drink 1%. Vouchers expire in 14 days. The wheel is a refined metallic wheel that spins only on tap. **Birthday Mystery Cup:** on the user's birthday (Dubai date) one `mystery` voucher is created once per year; the barista picks a surprise drink.

**Offers:** active promos, Common Hour schedule, tier perk table, my vouchers.

### 8.1 Barista dashboard (`/barista`, obsidian, big type)
Three columns **New / Preparing / Ready**. Card: huge order number, student first name, items with options, preferences note highlighted in brass, dine in/take away, paid/unpaid badge, age timer. Actions: **Start**, **Ready**, **Picked up**, **Undo**, **Cancel** (reason required). New order plays a soft chime (a "Enable sound" button is required first because browsers block autoplay) and highlights the column. **Sold-out switchboard** (searchable list with instant toggles). **Seat availability** control. **Accepting orders** toggle. Daily counters (orders today, average prep time). Connection dot with a reconnect banner. Smooth with 30+ open orders.

### 8.2 Admin (`/admin`)
Tabs: **Menu** (CRUD items, categories, options, image URL, tags, prep seconds, availability, accent color, needs-review flag), **Drink of the Month**, **Promos and Announcements**, **Events** (approve/reject), **Drink Lab** (promote/hide), **Reviews** (hide), **Analytics** (sales by day, top items, busiest hours heatmap, average prep time, meters issued), **Settings** (hours, days, allowed email domains, tier thresholds, squad bonus and levels, Common Hour window and multiplier, social links, accepting orders, barista count).

## 9. 3D layer (built after P0 and P1 are green)

Everything in `src/three/`, lazy loaded, each canvas inside an ErrorBoundary that renders the 2D fallback. `dpr={[1,1.5]}`, pause when the tab is hidden, dispose on unmount. **3D is on only if** WebGL2 exists, reduced motion is off, `hardwareConcurrency >= 4`, and `VITE_3D_ENABLED` is not `false`. Mobile: no shadows, no transmission, fewer lights.

**Look:** product-render quality, not cartoon. Studio lighting from Lightformers (warm key from top-left, cool navy rim, amber kicker), clearcoat ceramic, polished brass, chrome, obsidian, soft contact shadows. **No looping animation:** motion happens only when the user scrolls or drags.

**F16 "The Ascent" (landing):** 500vh page, sticky canvas, camera driven only by scroll progress `p`:
- **0.00-0.22 The cup:** white double-wall cup with the navy logo texture (from `logo.svg` rendered to a canvas texture) on a dark oak slab, overhead black ring light (torus with emissive warm-white inner edge), faint light shafts (static gradient planes). Headline "ELEVATE YOUR EXPERIENCES".
- **0.22-0.48 The rise:** camera lifts through layered soft gradient mist planes (static), cup recedes. Text "Every order is a step up."
- **0.48-0.72 The shield:** a brass-edged shield with the logo glows in the dark. Text "Earn meters. Climb tiers."
- **0.72-0.92 The range:** faceted obsidian mountains with brass ridge lines and four glowing flag markers: Base Camp, Ridge, Summit, Peak.
- **0.92-1.00 Summit:** sky gradient from ink to deep amber to cream haze, CTA "Start climbing".
Fallback: a refined scroll page with the cafe photos in `.glass` frames, section dividers in brass, no motion.

**F17 Cup tracker:** Lathe cup, glossy liquid whose height maps to status (placed 10%, preparing eases from 25% to 85%, ready 100% with a one-time glow). Liquid color from the item's `accent_color`. Up to 8 small cups queue behind it ("+N" label). Drag to rotate. Fallback: SVG cup.

**F18 Tier shield:** the 2D SVG ring ships first in F6. The 3D version is a metallic shield with a ring of segments filled to tier progress, orbit controls on drag. Fallback: SVG ring.

**Budgets:** initial route JS (without 3D chunk) under 350 KB gzip. LCP under 2.5 s on a mid phone on 4G. 60 fps laptop, 30+ fps phone. If average frame time exceeds 40 ms for 3 s, switch to the fallback for the session.

## 10. Data model (Postgres; all in `/supabase/migrations`)

All tables: `id uuid default gen_random_uuid()` PK (unless noted), `created_at timestamptz default now()`. **RLS enabled on every table.**

| Table | Key columns |
|---|---|
| `profiles` | `id` = `auth.users.id`, `full_name`, `email`, `role` enum (default student), `birth_month`, `birth_day`, `total_meters int default 0`, `squad_id`, `club_lead_of` |
| `menu_categories` | `name`, `sort` |
| `menu_items` | `category_id`, `name`, `description`, `base_price_fils`, `image_url`, `accent_color`, `kind` (hot/iced/smoothie/shake/bakery), `tags text[]`, `caffeine_level 0-3`, `prep_seconds default 90`, `is_available`, `is_active`, `needs_review`, `sort` |
| `option_groups` | `name`, `kind` (single/multi), `required`, `sort` |
| `options` | `group_id`, `name`, `price_delta_fils`, `tags text[]`, `is_extra_shot`, `is_available`, `sort` |
| `item_option_groups` | `item_id`, `group_id` (composite PK) |
| `orders` | `order_no int`, `order_date date` (Dubai), `user_id`, `status` enum, `dine_in`, `payment_method`, `payment_status`, `subtotal_fils`, `discount_fils`, `discount_label`, `tip_fils`, `total_fils`, `notes` (max 140), `voucher_id`, `client_request_id` (unique), `estimated_ready_at`, `placed_at`, `preparing_at`, `ready_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `meters_awarded`, `is_seed`. Unique (`order_date`,`order_no`). |
| `order_items` | `order_id`, `menu_item_id`, `name_snapshot`, `unit_price_fils`, `qty`, `options_snapshot jsonb` |
| `order_counters` | `order_date` PK, `last_no` |
| `meter_ledger` | `user_id`, `order_id`, `delta`, `reason` (order/squad_bonus/spin/adjustment); unique (`order_id`,`user_id`,`reason`) |
| `squads` | `name`, `code` (unique, 6 chars), `created_by`, `squad_meters` |
| `squad_members` | `squad_id`, `user_id` (unique) |
| `squad_bonus_log` | `user_id`, `day`, `meters` |
| `favorites` | `user_id`, `menu_item_id`, `options_snapshot jsonb` |
| `reviews` | `user_id`, `menu_item_id`, `rating 1-5`, `body` (280), `is_hidden`; unique pair; only after a completed order with the item |
| `promos` | `title`, `description`, `kind` (percent/amount/banner), `value`, `applies_to_item_id`, `starts_at`, `ends_at`, `is_active` |
| `announcements` | `title`, `body`, `kind` (info/exam_week), `starts_at`, `ends_at`, `is_active` |
| `drink_of_month` | `menu_item_id`, `headline`, `special_price_fils`, `month`, `is_active` (one active) |
| `vouchers` | `user_id`, `kind`, `value`, `label`, `source`, `expires_at`, `used_order_id` |
| `spins` | `user_id`, `prize_kind` (tickets = floor(completed orders / 5) minus spins) |
| `clubs`, `club_members` | club name, description; (`club_id`,`user_id`) unique |
| `events`, `event_rsvps` | event fields with `status` pending/approved/rejected; unique pair |
| `drink_submissions`, `drink_votes` | one submission per user per month; one vote per user per submission |
| `settings` | single row: `accepting_orders`, `open_time`, `close_time`, `days_open int[]`, `allowed_domains text[]`, `tier_thresholds jsonb`, `squad_bonus_pct`, `squad_levels jsonb`, `common_hour_start`, `common_hour_end`, `common_hour_multiplier`, `common_hour_days int[]`, `seat_status`, `social_links jsonb`, `barista_count` |

**Read-only views/functions:** `popular_items` (completed, last 14 days), `pairing_stats` (min support 5), `busy_hours` (28-day hour-of-day order counts and average wait), `club_leaderboard` (this month), `tier_for(meters)`.

### 10.1 RPC functions (`security definer`; each validates `auth.uid()` and role)
- `place_order(items jsonb, payment_method, dine_in, notes, tip_fils, voucher_id, client_request_id)`: checks open and accepting; **re-reads every price and option from the database**; rejects unavailable items or options with a clear error code; applies the single-best-discount rule and free-extra-shot perk; allocates `order_no` atomically; computes `estimated_ready_at`; marks voucher used; inserts everything in one transaction; a repeated `client_request_id` returns the existing order.
- `advance_order(order_id, to_status)`, `undo_order(order_id)`: barista/admin; legal transitions only; set timestamps; a second identical tap returns "already updated", not an error.
- `cancel_order(order_id, reason)`: student only while `placed` and own; barista/admin any status except `completed`; releases a used voucher.
- `complete_order(order_id)`: barista/admin, or the owner when `ready`. One transaction: set `completed`; meters = floor(total after discount, excluding tip) x Common Hour multiplier when `placed_at` (Dubai) is inside the window; idempotent ledger rows; update `profiles.total_meters`; squad bonus with daily cap; update `squads.squad_meters`; return breakdown and whether the tier changed. Calling twice never awards twice.
- `queue_info(order_id)`: `ahead_count` (orders in `placed`/`preparing` with earlier `placed_at`) and `estimated_ready_at`.
- `spin_wheel()`, `create_squad`, `join_squad`, `leave_squad`, `remove_squad_member`, `toggle_favorite`, `submit_review`, `submit_drink`, `vote_drink`, `promote_drink` (admin), `rsvp_event`, `join_club`, `issue_birthday_voucher` (idempotent per year).

**ETA:** `now() + (sum of prep_seconds x qty of orders ahead plus this order) / barista_count`, shown rounded to the minute ("about 4 min").

### 10.2 RLS rules
- `profiles`: read/update own row **except** `role`, `total_meters`, `squad_id` (column privileges or trigger). Barista/admin read order owners' names. Squad mates and leaderboard views expose only `full_name` and meters.
- Menu, options, promos, announcements, drink_of_month, clubs, settings, approved events: readable by signed-in users; writable by admin only (barista may update only `menu_items.is_available`, `settings.seat_status`, `settings.accepting_orders`).
- `orders`, `order_items`: students read own; barista/admin read all; **no client inserts or updates** (RPC only).
- `meter_ledger`, `vouchers`, `spins`: read own; no client writes. `reviews`: readable (hidden excluded); writes via RPC. Squad, RSVP, vote rows: via RPC.
- The service role key appears only in scripts.

### 10.3 Realtime
Subscribe (postgres_changes) to `orders` (student: own; barista: today's), `menu_items`, `settings`. On any event invalidate the relevant TanStack Query. **Also poll every 15 s as a fallback**, refetch on reconnect, show a small reconnecting indicator.

## 11. Smart Sip rules (F21)

**Mood map** (tags and `caffeine_level` 0-3): Exam week / need focus: caffeine 2-3, low-sugar preferred (cold brew, americano, double espresso). Chill: caffeine 0-1 (smoothies, shakes, decaf, lattes). Post-gym: smoothies with banana/protein tags. Sweet tooth: items tagged sweet, caramel and vanilla syrups. Energy slider 1-3 sets the caffeine target. **Weather toggle:** fetch the current temperature from Open-Meteo (no key) for Dubai (lat 25.2048, lon 55.2708); above 30 C boost iced and cold, below 22 C boost hot; if the fetch fails, skip silently. Return the top 3 available items with a one-line reason.
**Pairing:** on Drink of the Month and item detail, from `pairing_stats`, candidates in the Bakery category. Fewer than 5 supporting orders: show nothing. Never show a made-up percentage.

## 12. Quality and bug prevention

### 12.1 Bug traps that must be handled
1. Double tap on Place order -> one order (button lock plus `client_request_id`).
2. Two orders in the same second -> distinct `order_no` (atomic counter).
3. Item sells out while in cart -> clear message, rest of cart kept.
4. Tampered price in browser -> server recomputes.
5. Refresh or network loss mid-order -> tracker reloads from the database.
6. Two barista taps -> validated server-side, "already updated".
7. Order completed twice -> meters awarded once.
8. Cafe closed or kill switch -> ordering disabled with a friendly message; existing orders continue.
9. Timezone -> Dubai time even on a laptop set elsewhere.
10. Realtime drop -> 15 s polling.
11. iOS Safari -> `dvh`, 16px inputs, safe areas, audio unlocked by a tap, feature-detect `navigator.vibrate`.
12. Every list has a designed empty state; every query has a skeleton and an error with retry; no console errors.
13. Role escalation -> student calling barista RPCs gets a permission error.
14. Squad abuse -> daily cap, one squad, size cap.
15. Long text -> length limits and wrapping; never `dangerouslySetInnerHTML`.
16. Stale promo or voucher -> validated at order time on the server.
17. Glass and blur on weak devices -> opaque fallback (Section 4.2).

### 12.2 Automated tests (before every commit: `npm run typecheck && npm run test && npm run build`; e2e at milestones)
**Vitest:** pricing (options, quantity, best-single-discount, free shot, tip excluded), meters (rounding, Common Hour, thresholds), squad bonus (cap, buyer excluded), ETA, contrast of all token pairs.
**Playwright:** (1) signup rejects a non-allowed domain, accepts an allowed one; (2) golden path: student orders -> barista Start -> Ready -> student sees READY -> Picked up -> meters and tier update; (3) double-click Place order makes one order; (4) sold-out toggle blocks adding in real time; (5) student cannot open `/barista` or `/admin`; (6) squad create, join, order, bonus appears; (7) golden path with `VITE_3D_ENABLED=false`; (8) smoke tests at 390x844 and 1440x900 for Home, Menu, Cart, Tracker, Barista.
**Visual check:** after each UI milestone take Playwright screenshots of key screens at both sizes and **look at them yourself**, comparing against `docs/DESIGN_NOTES.md` and Section 4. Fix anything flat, matte, cramped, misaligned, or low-contrast before moving on.

## 13. Accessibility
Keyboard navigation, visible amber focus rings, `aria-live="polite"` for queue changes, alt text, AA contrast, 44px targets, reduced motion respected, no text baked into images. English only. Errors are human ("That drink just sold out. Pick another?").

## 14. Seed data (`npm run seed`, uses service role, safe to re-run)
- **Menu:** Smoothies and Milkshakes transcribed from Photo A (Section 0.3). Coffee: Espresso, Americano, Flat White, Latte, Cappuccino, Iced Latte, Cold Brew, **Caramel Cloud Latte** (Drink of the Month). Bakery: Butter Croissant, Tiramisu (weekly special, from the maroon card in Photo A). **Prices are placeholders** (reasonable AED values), editable in admin; show a "placeholder price" tag to admin only.
- Option groups: Size (S/M/L), Milk (Whole, Skim, Oat, Almond; Oat and Almond tagged dairy-free), Extra shot, Syrup (Caramel, Vanilla, Hazelnut), Sugar (Regular, Low, None), Temperature (Normal, Extra hot, Iced where valid).
- **Demo accounts** (domain `altitude.demo`, password from `DEMO_PASSWORD`; list them in the README and note they must be removed or rotated after the event): `student1` (Base Camp), `student2` (Ridge, squad with `student3`), `student3` (Summit), `student4` (Peak), `barista`, `admin`, `clublead`.
- Clubs: AIRC, ASHRAE RIT Dubai, IEEE, Robotics, Debate. Three approved events and one pending.
- About 2,000 historical orders across 28 days (`is_seed = true`) with realistic weekday and hour peaks (9-10 AM, 12-1 PM), co-purchases (Caramel Cloud Latte with Butter Croissant about 85%), some reviews, five Drink Lab submissions, one active exam-week announcement.
- Settings: hours 07:30-18:00 Mon-Fri, Common Hour 14:00-16:00 Mon-Fri at 2x, seats Plenty, squad bonus 10%.

## 15. Pitch support (build into the product)
- Admin-only `/demo` page: "Reset demo data", "Create sample order", "Jump order to Ready", so the pitch is reliable.
- README: 60-second setup, demo accounts, rollout plan.
- **Rollout content:** free tiers (near-zero cost), works on any phone or the counter laptop, MOBIPOS adapter ready for the vendor (1-2 day task), email verification and Web Push switched on before launch, barista training is one screen.
- **3-minute pitch:** 0:00 live demo (phone orders, barista laptop taps, phone alerts) -> 0:40 problem (queues, no rewards) -> 1:10 the climb (meters, squads, Drink Lab, clubs) -> 2:15 feasibility and rollout -> 2:45 the ask: "Put it on the menu."
- **Honesty:** say "demo payment", "demo data", "recommendation engine"; never claim MOBIPOS works.

## 16. Build plan (autonomous, in this order)

Hard stops: **feature freeze Sat 10 PM Dubai, code freeze Sun 10 AM, submit by Sun 11 AM** (deadline 12 PM). It is already after midnight on Sat 7 Nov, so work efficiently and keep `PROGRESS.md` current.

| # | Milestone | Done when |
|---|---|---|
| M0 | Credentials check (0.2), repo, Vite + Tailwind, tokens and materials CSS, fonts, **reference-picture jobs (0.3)**, component kit and `/kit`, migrations for every table plus RLS plus auth domain trigger, `db:migrate`, auth screens, PWA shell, deploy | Login works, roles enforced, `/kit` shows the glossy look |
| M1 | Seed script, DrinkArt, menu browse, item detail with options, filters, cart, `place_order` RPC, pricing tests | A student can place a correct order; pricing tests pass |
| M2 | Tracker, `queue_info`, barista dashboard, advance/undo/cancel/complete, ready alert, meters and tiers, 2D ring, **Playwright golden path** | Whole P0 loop passes e2e on phone and laptop |
| M3 | Admin (menu CRUD, sold-out, kill switch, DOTM, promos, settings), favorites, popular picks, preferences note, tip, Offers tab, announcements, Common Hour | P1 commerce passes tests |
| M4 | Squad, clubs and leaderboard, events and RSVP, reviews, seat status, social links, busy-time chart, Home assembled with photography | P1 complete, e2e green, deploy |
| M5 | Visual polish pass 1: screenshots of every screen at both sizes, fix anything matte or inconsistent, tune photo scrims and brass details | Looks premium everywhere |
| M6 | 3D: tier shield, cup tracker, then the landing "Ascent" (verify fallback with `VITE_3D_ENABLED=false` after each) | Fallbacks verified, budgets met |
| M7 | Drink Lab, reward wheel, vouchers, birthday cup, mood picker, weather, pairing, analytics, `/demo` | Works and tested (cut anything unfinished, order below) |
| M8 | Bug bash against 12.1 and 12.2, README, `DECISIONS.md`, final screenshots and e2e | All green |
| M9 | Final deploy and a short `SUBMISSION.md` (live URL, demo accounts, 5 talking points) | Ready to submit |

**Cut order if time runs short (cut from the top):** analytics, weather, birthday cup, reward wheel, Drink Lab, 3D landing, 3D cup, reviews, events. **Never cut:** P0, the golden-path test, fallbacks, `/demo`, the visual polish pass.

## 17. Working rules (write these into `CLAUDE.md`)

1. Read `PRD.md` and `PROGRESS.md` at the start of every session. Never ask the user design questions.
2. TypeScript strict; no `any` unless commented. Zod-validate external input.
3. All pricing, discount, meter, and status rules live in **database functions**. The client displays results. Never trust client-sent prices or roles.
4. Money is integer fils. Time is `timestamptz`, shown in Asia/Dubai.
5. Every table has RLS. The service role key and `DATABASE_URL` never reach the client bundle.
6. Every data screen has loading, empty, and error states.
7. Use the materials and components from Section 4 everywhere. No flat matte one-off styling. No emoji in the UI. No looping decorative animation.
8. 3D lives in `src/three/`, lazy loaded, ErrorBoundary, 2D fallback. Do not start 3D until P0 and P1 tests are green.
9. No libraries beyond Section 5 without a reason written in `DECISIONS.md`. No features outside this PRD. No refactoring working code without cause.
10. Never invent social URLs, student data, or a different logo symbol. Prices are marked placeholders.
11. Run typecheck, test, and build before every commit; commit after every working slice; update `PROGRESS.md`.
12. Keep context small: read only what you need, summarize errors, no giant logs.
13. Do not wait for approval between milestones.

## Appendix A: Source brief and teammate ideas (so nothing is missed)

**ideaForge kickoff (AIRC x Altitude):** build the app that fuels Altitude. Six suggested problems (not limits): (1) loyalty rewards, (2) order and queue with live position and ready alert, (3) popular picks from order history, (4) promo spotlight and drink of the month, (5) club and event hub for RIT clubs, (6) online payments integrated with MOBIPOS. Phase 1: submit a PPT and a working prototype by Sun 8 Nov, 12 PM. Top 7 teams advance. Phase 2: pitch Mon 9 Nov, 12-1 PM, 3 min pitch + 2 min Q&A. Judging out of 100: Solution Fit 25, Innovation & Creativity 20, Technical Execution 20 (a working prototype), Design & Experience 20 (intuitive, polished, a joy to use), Pitch & Feasibility 15. Prizes: AED 100 Altitude voucher per winning member; the winning team co-creates a drink that joins the menu for a month named after the team; chance of a real rollout. The deck's illustrative phone shows: greeting, Gold tier with points and "260 pts to Platinum", "Order #27, 3 ahead of you, we'll alert you when it's ready", Drink of the Month "Caramel Cloud Latte", and Popular Now (Iced Latte, Cold Brew, Croissant).

**Where every teammate idea lives in this PRD**

| Idea | Feature |
|---|---|
| Reviews for items | F14 |
| Reserve seats / space availability | F15 seat status now; reservation on roadmap |
| Star your usual drink | F8 |
| Giveaways: spin the wheel, win vouchers | F20 |
| Discounts tab | F10 / Offers screen |
| Filters (dairy-free, low-sugar, price range) | F2 filters sheet |
| Checkout preferences textbox (extra hot, room temp) | F3 |
| Tipping | F3, decision 13 |
| Follow Altitude social icons | F15 |
| Exam week offers and pop-ups | F10 announcements |
| Mystery cup on birthdays | F20 |
| Food + drink pairing for the Drink of the Month | F21 pairing (real stats) |
| Pre-order, collect fast, estimated prep time | F4 queue and ETA |
| Common hour as happy hour with extra rewards | F11 |
| Tier system with perks (extra shots, discounts) | F6, decision 3 |
| AI drink recommendations by weather, mood, energy | F21 mood picker and weather (rules by default, optional LLM) |
| Ascend mountain concept, meters, tiers | Sections 1, 6, F6 |
| Squad social loyalty | F12, decisions 5-7 |
| Club Summit Challenge | F13 |
| Community Drink Lab | F19 |
| Busy-time chart | F9 |
| Barista dashboard, sold-out switch, undo | F5 |
| Admin: menu, drink of the month, promos, analytics | F7, F22 |
| 3D landing, 3D cup, 3D ring; works without 3D | Section 9 |
| Payment adapter, never claim MOBIPOS works | Decision 11 |
| Group cart | Roadmap (explicitly cut) |
