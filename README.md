# CondoScout SG — Singapore Condo Viewing Checklist & Comparison App

A **mobile-first web app for taking notes at Singapore resale condo viewings**. Walk through a comprehensive, Singapore-specific checklist (lighting, noise, ventilation, renovation condition, MCST fees, remaining lease, and 70+ more checks), answer everything with one tap, snap photos room by room, record the agent's details — then **compare every unit you've viewed side by side** and let the scores tell you which condo to shortlist.

Built with Next.js, deployable to Vercel in one click, with cloud storage on Vercel Blob.

## Why

Buying a resale condominium in Singapore means viewing many units and forgetting the details of most of them. Was it Bayshore Park or Costa del Sol that had the water stain above the master bedroom window? Which unit had the west sun? What did that agent say about the maintenance fee? CondoScout keeps every observation, photo and number in one structured place — and turns them into an apples-to-apples comparison.

## Features

- 📋 **70+ question Singapore-specific checklist**, organised into 12 sections:
  - ☀️ Light & orientation (west-sun exposure, blocked windows)
  - 🔇 Noise & quietness (traffic, MRT/flight path, construction, neighbours)
  - 🌬️ Ventilation & smell (cross-vent, damp, rubbish chute)
  - 🧱 Interior condition (leaks, mould, cracks, reno needed)
  - 🍳 Kitchen & wet areas (water pressure, drainage, heater)
  - ❄️ Aircon & electrical (age, ledge access, DB box)
  - 📐 Layout & space (bay windows/planters, storage, room sizes)
  - 🌇 View & privacy (blocked view, overlooked, bin centre)
  - 🏊 Building & facilities (lifts, pool, carpark ratio, façade spalling)
  - 🧾 Management & fees (maintenance fee, special levy, en-bloc)
  - 📍 Location & connectivity (MRT walk, 1km schools, URA Master Plan)
  - 💰 Price & deal (vs recent transactions, valuation, remaining lease, seller motivation)
- 👆 **Tap-to-answer chips** — no typing during a viewing; each answer is scored and rolls up into section scores and an overall 0–100 score
- 💡 **Built-in tips** on what to check (e.g. "run the shower and a tap at the same time")
- 📷 **Photo capture per section**, compressed on-device and stored with the viewing
- 🏢 **Pre-loaded database of 340+ Singapore condos** — search by name or area, and district / tenure / TOP year link automatically
- 🧑‍💼 **Agent tracking** — name, agency, phone (tap to call), CEA registration number
- 📊 **Compare & analyse** — side-by-side table with best-in-row highlighting, overall ranking bars, and insights (highest score, cheapest PSF, best score-for-price)
- 🔎 **Filters** — status, district, bedrooms, max price, plus sort by score / price / PSF
- 🔐 **Login** — username/password accounts (scrypt-hashed, session cookies) plus optional "Sign in with Google"; every account gets its own private data space
- 📏 **GFA-harmonization area converter** — Singapore harmonized strata-area definitions on 1 Jun 2023 (aircon ledges/voids no longer count, historically ~4–7% of listed area, sometimes more with planters). Mark a unit's listed area as pre- or post-harmonization and the app computes the harmonized sqft and **harmonized PSF** (adjustable factor, default ÷1.07) so old resale stock and new launches compare apples-to-apples
- 🗂️ **Auto-populated property metrics** — picking a project from the database fills in nearest MRT + walk time, facilities, public primary schools within 1km, nearby international/private schools, indicative gross rental yield, maintenance-fee band, en-bloc history, carpark ratio and EV charging (all indicative — verify before you buy)
- ✨ **Checklist pre-fill** — linking a project auto-answers the derivable chips in Building & Facilities, Management & Fees, Location & Connectivity, and Price & Deal (pool/gym presence, carpark, EV, fee band, en-bloc, MRT walk band, schools, remaining lease, yield). Pre-filled answers are ordinary chips — tap to correct anything that's wrong; your own answers are never overwritten
- 💾 **Cloud storage on Vercel Blob** with automatic on-device (IndexedDB) fallback and one-tap migration to cloud
- 📱 **Mobile-first PWA** — add it to your home screen, green theme, works one-handed at a viewing

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without cloud storage configured, everything is saved in your browser (IndexedDB) — fully functional for trying it out.

## Deploy to Vercel with cloud storage

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/new) (or `npx vercel`).
2. In the Vercel dashboard → your project → **Storage** → **Create Database** → **Blob** → connect it to the project. This adds the `BLOB_READ_WRITE_TOKEN` environment variable automatically.
3. Set the auth environment variables (Settings → Environment Variables):
   - `AUTH_SECRET` — any long random string (e.g. `openssl rand -hex 32`)
   - `DEFAULT_USER` / `DEFAULT_PASSWORD` — seeds the first account on first login
4. Redeploy. Sign in with the default account; change the password from the 👤 Account page.
5. If you logged viewings on a phone before connecting the store, the home screen offers a one-tap **"Upload to cloud"** migration into your account.

### URA market data (optional, recommended)

The 📊 Market data card on each viewing shows the last 12 months of actual transactions for the linked project (similar sizes, with estimated layout, floor range, price and PSF), compares the asking PSF against the 12-month median, and ranks nearby same-district projects by transaction activity with their median PSF/price. Data comes from the official [URA Data Service](https://eservice.ura.gov.sg/maps/api/):

1. Register for a free access key at [eservice.ura.gov.sg/maps/api](https://eservice.ura.gov.sg/maps/api/) (emailed on activation).
2. Add `URA_ACCESS_KEY` to Vercel env vars and redeploy.
3. The first market query builds a cached 12-month dataset; a weekly Vercel cron (`vercel.json`) keeps it fresh. Optionally set `CRON_SECRET` so the cron endpoint is authenticated.

Note: live "units for sale" listing counts aren't available from any public API (that data belongs to the listing portals), so nearby projects show completed-transaction activity instead.

### Google sign-in (optional)

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials) create an **OAuth client ID** (type: Web application) and add your deployment URL to *Authorized JavaScript origins*.
2. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel env vars and redeploy.
3. A "Sign in with Google" button appears on the login page; each Google account gets its own workspace automatically.

### Privacy note

Viewings and account data are only reachable through the authenticated API. Photos are served from Vercel Blob via unguessable public URLs (standard Blob behaviour) — fine for personal use, but don't treat photo URLs as secrets.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for viewings + photos, IndexedDB fallback
- No UI framework — hand-rolled green design system, ~0 dependencies beyond Next

## Condo database accuracy

`data/condos.json` ships with 340+ well-known Singapore condominiums (name, district, area, tenure, approximate TOP year) as a convenience for quick linking. Values are approximate — always verify tenure and lease start against the Option to Purchase / title search. You can also just type any condo name that isn't in the list.

## Keywords

Singapore condo viewing checklist · resale condo Singapore · property viewing notes app · condo comparison tool · house hunting Singapore · HDB vs condo · buy resale condominium Singapore · property inspection checklist

## License

MIT
