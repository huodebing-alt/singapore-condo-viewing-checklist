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
3. Redeploy. The app detects the store and saves all viewings and photos to Vercel Blob.
4. If you logged viewings on your phone before connecting the store, the home screen offers a one-tap **"Upload to cloud"** migration.

### Privacy note

This is a personal, single-user app with no authentication. Data is stored in your own Vercel Blob store under unguessable URLs, but anyone with your deployment URL can read/write the app. For personal use that's usually fine; enable [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection) (Settings → Deployment Protection) if you want it locked behind your Vercel login.

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
