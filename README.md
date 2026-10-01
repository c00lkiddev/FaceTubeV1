# FaceTube

**A social video platform — YouTube meets Facebook.**

# 🌐 **Live at: https://facetubeapp.pages.dev**

FaceTube lets people upload videos, share short text updates, comment, and like content. It runs entirely on Cloudflare's edge network with no servers to maintain, no ads, and no paywalls.

---

## Features

- ✅ User accounts with email and password
- ✅ Video uploads (URL-based)
- ✅ Custom video player with seek, skip, volume, fullscreen
- ✅ YouTube embed support — plays inline on FaceTube
- ✅ YouTube search with live suggestions
- ✅ Comments on videos, newest first
- ✅ Likes that toggle per user
- ✅ Text posts in the home feed
- ✅ User profiles with subscriber counts
- ✅ Subscribe / unsubscribe between users
- ✅ Responsive layout (mobile + desktop)
- ✅ Android build via Capacitor
- ✅ Zero cost — no ads, no tracking, no paid tiers

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS v4 |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 |
| Hosting | Cloudflare Pages |
| Mobile | Capacitor |

The frontend is a static export. The API is a single Pages Function at `functions/api/[[path]].ts`. Data lives in D1 — serverless SQLite distributed across Cloudflare's network.

---

## Architecture

Pages are pre-rendered as static HTML/CSS/JS and served from Cloudflare Pages. All routes use **static query strings** (`/watch?id=...`, `/profile?id=...`) so no dynamic routing or SPA fallback is needed.

Auth is simple. On register, the password is SHA-256 hashed via Web Crypto and stored in D1. On login, the same hash is compared. The user ID is stored in `localStorage` and sent with requests that need identity.

No session cookie, no JWT, no server-side rendering. Everything is client-side, which keeps hosting free.

---

## Running locally

Clone the repo and install dependencies.

```bash
git clone https://github.com/c00lkiddev/FaceTubeV1.git
cd FaceTubeV1
npm install
```

Start the dev server.

```bash
npm run dev
```

It runs at http://localhost:3000.

By default the frontend points at the local dev server for the API. To develop against the real backend, create `.env.local`:

```bash
echo "NEXT_PUBLIC_API_URL=https://facetubeapp.pages.dev" > .env.local
```

---

## Deploying

Everything is on Cloudflare's free tier. First-time setup:

```bash
npm install -g wrangler
wrangler login
wrangler d1 create facetube
wrangler d1 execute facetube --file=./functions/schema.sql --remote
```

Then deploy:

```bash
rm -rf .next out
npm run build
wrangler pages deploy out --project-name=facetubeapp --branch=main --commit-dirty=true
```

After the first deploy, add these in the Cloudflare dashboard:

**Settings → Environment variables (Production):**
- `OWNER_EMAIL` — the email that gets the owner crown badge
- `YOUTUBE_API_KEY` — for YouTube search + suggestions

**Settings → Functions → D1 database bindings:**
- Variable name: `DB`
- D1 database: `facetube`

Then redeploy so the bindings take effect:

```bash
wrangler pages deploy out --project-name=facetubeapp --branch=main --commit-dirty=true
```

---

## Auto-deploy from GitHub

Connect the repo in Cloudflare Pages:

- **Framework preset:** None
- **Build command:** `npm run build`
- **Build output directory:** `out`

Every push to `main` triggers a rebuild.

---

## Quick deploy script

Save this as `~/deploy.sh` and run it whenever you change code:

```bash
#!/bin/bash
cd ~/facetube
rm -rf .next out
npm run build || exit 1
wrangler pages deploy out --project-name=facetubeapp --branch=main --commit-dirty=true
git add -A
git commit -m "deploy $(date +%Y-%m-%d_%H:%M)" 2>/dev/null
git push 2>/dev/null
echo "✅ Deployed"
```

Then:

```bash
chmod +x ~/deploy.sh
~/deploy.sh
```

---

## Android build

```bash
npm run build:mobile
npx cap add android
npx cap sync
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

---

## Project structure

```
facetube/
├── functions/
│   ├── api/[[path]].ts       # Cloudflare Pages Function (entire API)
│   └── schema.sql            # D1 database schema
├── public/
│   ├── _redirects            # Cloudflare routing rules
│   └── _headers              # Cache + security headers
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home feed
│   │   ├── login/page.tsx    # Login + register
│   │   ├── upload/page.tsx   # Video upload
│   │   ├── watch/page.tsx    # Video player + comments
│   │   ├── profile/page.tsx  # User profile + subscribe
│   │   ├── youtube/page.tsx  # YouTube embed player
│   │   ├── search/page.tsx   # YouTube search results
│   │   └── admin/page.tsx    # Owner-only control panel
│   ├── components/
│   │   ├── TopBar.tsx        # Nav + search with suggestions
│   │   ├── VideoPlayer.tsx   # Custom player + YouTube detection
│   │   ├── OwnerBadge.tsx    # Crown for owner
│   │   └── VerifiedBadge.tsx # Blue check at 1k subs
│   └── lib/
│       └── api.ts            # API client + storage helpers
├── next.config.ts
├── package.json
└── README.md
```

---

## Cost

Zero. Cloudflare Pages, Functions, and D1 all have free tiers that don't expire. No credit card required.

---

## License

MIT License

Copyright (c) 2026 FaceTube

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
