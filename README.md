# Ride Easy · Bike Rentals — clickable prototype

A client-demo prototype of a hotel bike-rental site for La Digue, Seychelles, rebuilt from the Lovable prototype screens and the requirements brief. It includes a **palette switcher**, so the client can see the whole site in each colour palette that pairs with their hotel website.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pricing + availability unit tests
npm run build      # production build in dist/
```

Admin: `/admin`. Demo login: `admin@rideeasy.test` / `RideEasy@2026` (also shown on the login page).
A 5-minute demo script is in the app at `/admin/demo-guide`.

## Colour palettes

Use the **Palette** button (bottom-left on the public site, bottom-right in admin) to switch between:

| Palette | Pairs with hotel palette | Feel |
|---|---|---|
| Coastal Ride (default, recommended) | Anse Lagoon | Fresh, sunny, coastal |
| Island Trail | La Digue Garden | Green, earthy, relaxed |
| Sunrise Pedal | Tropical Sunrise | Bold, sporty, adventurous |

- The choice is remembered on the device. **Share link** copies a URL with `?palette=coastal|trail|sunrise`.
- All palettes live in `src/theme/palettes.ts`. They are applied as CSS variables and exposed as Tailwind tokens (`bg`, `surface`, `ink`, `primary`, `cta`, `ride`, `tint`, `dark`, …), so components never hard-code hex values.
- Bike status colours (Available, Few left, Booked, Return due) are shared by all palettes so their meaning never changes.

## How it's built

- Vite + React 18 + TypeScript + Tailwind, react-router, zod + react-hook-form.
- **Business logic is framework-free** (for the future mobile app):
  - `src/lib/pricing.ts`: hour/day/week pricing with caps, single best promotion, readable breakdowns.
  - `src/lib/availability.ts`: overlap rule, 15-minute payment holds, units free.
  - `src/lib/stats.ts`: dashboard and calendar figures.
- **Prototype backend:** `src/lib/db.ts` keeps the data in the browser's localStorage, seeded with demo data from `src/lib/seed.ts` (dates relative to today). `src/lib/api.ts` is the only module that touches it and mirrors the brief's database functions (`create_booking`, `get_booking_by_reference`, `get_bike_availability`) and access rules (admin role via a separate `user_roles` table, guests can only read a booking with reference + email). To move to a hosted database, replace the bodies in `api.ts`. Reset the demo data in Admin → Settings.
- Payments are simulated: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` is declined; PayPal and Google Pay show a mock approval screen.

## Not included (prototype)

Real payments/refunds, real email, a hosted database and real authentication (sign-in and access checks run in the browser), multiple languages and currencies, delivery to other hotels, deposits/damage handling, staff roles, and the mobile app.
