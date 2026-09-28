# FaceTube

A social video platform — YouTube meets Facebook.

FaceTube lets people upload videos, share short text updates, comment, and like content. It runs entirely on Cloudflare's edge network with no servers to maintain, no ads, and no paywalls.

## Why it exists

Most social platforms are heavy, cluttered, and ad-driven. FaceTube is a place to watch and share videos without the noise. Everything runs on free-tier infrastructure, so it can stay online indefinitely with no backend bill.

## Features

- User accounts with email and password
- Video uploads by URL
- Comments on videos, newest first
- Likes that toggle per user
- Text posts in the home feed
- Responsive layout — sidebar on desktop, bottom nav on mobile
- Android build via Capacitor

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 |
| Hosting | Cloudflare Pages |
| Mobile | Capacitor |

The frontend is a static export, hosted anywhere with zero runtime cost. The API is a single Worker handling every endpoint. The database is D1, serverless SQLite distributed across Cloudflare's network.

## Architecture

Pages are served from Cloudflare Pages as static HTML, CSS, and JavaScript. When a user loads a page, the browser fetches data from the Worker API, which queries D1 and returns JSON.

Auth is simple. On register, the password is hashed with SHA-256 via Web Crypto and stored in D1. On login, the same hash is compared. The user ID is stored in local storage and sent with requests that need identity.

No session cookie, no JWT, no server-side rendering. Everything is client-side, which keeps hosting free.

## Local development

Clone the repo and install dependencies.

npm install

Start the dev server.

npm run dev

It runs on port 3000.

By default the frontend points at the local dev server for the API too. To develop against a real backend, create an environment file and set the API URL variable to your deployed Worker address.

## Deploying the API

Install Wrangler globally.

npm install -g wrangler

Log in.

wrangler login

Create the database.

wrangler d1 create facetube

Paste the printed database ID into the Wrangler config under the D1 binding.

Create the tables.

wrangler d1 execute facetube --file=./workers/schema.sql

Deploy.

wrangler deploy

Wrangler prints the Worker address after it finishes.

## Deploying the frontend

Point the API URL variable in the environment file at the Worker address from the previous step.

Then build and deploy.

npm run build
wrangler pages deploy out

Wrangler asks for a project name on first run. Use facetube.

## Android build

Build the mobile version.

npm run build:mobile

Add the platform.

npx cap add android
npx cap sync
npx cap open android

In Android Studio, go to Build, then Build APK(s). The APK lands in the Android output folder.

Rename it to facetube.apk, move it into the public folder, and redeploy. It becomes downloadable from the download page.

## Auto-deploy

A GitHub Actions workflow builds and deploys the site on every push to main. Generate a Cloudflare API token from the dashboard using the "Edit Cloudflare Workers" template, add it as a repo secret named CF_API_TOKEN, and every push goes live automatically.

## Keepalive

GitHub disables scheduled workflows after 60 days of inactivity. The keepalive workflow makes a small automated commit if the repo goes quiet, resetting the timer. Auto-deploy keeps running even if the project is idle for months.

## Cost

Zero. Cloudflare Pages, Workers, and D1 all have free tiers that don't expire. No credit card required.

## Platforms

- Web — any modern browser
- Android — APK from the download page
- iOS — Safari, Share, Add to Home Screen
- Desktop — the web version

## License

MIT License

Copyright (c) 2026 FaceTube

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
