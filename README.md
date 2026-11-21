# Velox · Run Lab

Pratham's personal running web app: log runs, track weekly pace and progress, plan goals, and download weekly reports.
Built with Next.js 15 (App Router), framer-motion, Recharts and canvas-confetti. It needs no API keys and no backend.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On vercel.com, click New Project, import the repo and press Deploy. The Next.js defaults work as-is.

Or from the terminal: `npx vercel` (and `npx vercel --prod` to go live).

## Data
- Runs, goals and settings are saved in the browser's localStorage, so each device keeps its own copy.
- To move data between phone and laptop, use Settings (gear icon), then **Export backup** on one device and **Import backup** on the other.
- The app ships pre-loaded with runs 1–32 from the coaching chat. Runs 1–25 are tagged `est. date` because the chat didn't give exact dates.

## Tabs
- **Dashboard**: totals, this-week ring vs. weekly km goal, week strip, weekly km chart, pace trend, average weekly pace, today's goals, recent activity
- **Activities**: Strava-style cards or a sortable table, with filters for pace range, day of week, date range, time of day, run type, distance and text search
- **Weekly**: week navigator, daily distance, pace per run, goals, a 12-week progress table, and downloads (`.txt` text report, `.html` visual report with charts, print/save as PDF)
- **Goals**: month calendar, goals on any date (with weekly repeat), tick to complete with a celebration. Goals with a target distance auto-complete when a matching run is logged.
- **Insights**: PBs, race predictor (1.6K / 5K / 10K / half), 10K pace splits, easy/steady/hard training balance, consistency heatmap, badges
- **Live**: stopwatch with optional GPS distance (browser geolocation). Finishing opens the log form pre-filled with the date, time and duration.
