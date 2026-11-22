# Velox · Run Lab

A running web app for anyone: log runs, track weekly pace and progress, plan goals, and download weekly reports.
Built with Next.js 15 (App Router), Better Auth, Postgres, framer-motion, Recharts and canvas-confetti.

## Accounts
- **Sign up / sign in** with email + password, username + password, or **Google**.
- **Email verification** on sign-up, and **forgot password** emails a reset link.
- **Passkeys** (Face ID / Touch ID / fingerprint / Windows Hello): turn on in Profile & settings, then use "Sign in with Face ID / fingerprint".
- **Profile** (gear icon): edit name, username, email (confirmed by email link), password, passkeys.
- Every account's data is private and keyed by account id. New accounts start completely empty.
- The **owner account** (`OWNER_USERNAME`) is created once with the original run log. Editing its name, username, email or password never touches its data.

## Setup (Vercel)
1. Push to GitHub, then on vercel.com: **New Project → import the repo**.
2. **Storage → Create → Neon (Postgres)** and connect it to the project. This sets `DATABASE_URL`.
3. **Settings → Environment Variables**: add the keys from `.env.example`:
   `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (`https://<your-app>.vercel.app`),
   `RESEND_API_KEY`, `EMAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_USERNAME`, `OWNER_NAME`, `OWNER_PASSWORD`.
4. Deploy. The build runs `scripts/migrate.mts` first, which creates tables and the owner account automatically.
   After the first successful deploy you can delete `OWNER_PASSWORD` from Vercel.

### Google sign-in
console.cloud.google.com → APIs & Services → OAuth consent screen (External) → Credentials → **Create OAuth client ID → Web application**.
- Authorized JavaScript origins: `https://<your-app>.vercel.app` and `http://localhost:3000`
- Authorized redirect URIs: `https://<your-app>.vercel.app/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google`

### Email (Resend)
resend.com → API Keys → create a key (`RESEND_API_KEY`). To email any address, verify a domain in Resend and set
`EMAIL_FROM="Velox Run Lab <noreply@yourdomain.com>"`. Without a verified domain, Resend only delivers to your own address.

## Run locally
```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL etc.
npm run db:migrate           # create tables (+ owner account)
npm run dev                  # http://localhost:3000
```
Without `RESEND_API_KEY`, verification/reset links are printed in the terminal.

## Tabs
- **Dashboard**: totals, this-week ring vs. weekly km goal, week strip, weekly km chart, pace trend, average weekly pace, today's goals, recent activity
- **Activities**: Strava-style cards or a sortable table, with filters for pace range, day of week, date range, time of day, run type, distance and text search
- **Weekly**: week navigator, daily distance, pace per run, goals, a 12-week progress table, and downloads (`.txt`, `.html` visual report, print/save as PDF)
- **Goals**: month calendar, goals on any date (with weekly repeat), tick to complete with a celebration
- **Insights**: PBs, race predictor, 10K pace splits, training balance, consistency heatmap, badges
- **Live**: stopwatch with optional GPS distance. Finishing opens the log form pre-filled.
