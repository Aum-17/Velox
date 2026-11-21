import type { Run, Goal } from "./types";
import { allWeeks, paceOf, streak, summarize } from "./utils";

export interface Badge {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  test: (runs: Run[], goals: Goal[]) => boolean;
}

const longest = (r: Run[]) => summarize(r).longest;
const best = (r: Run[], minKm: number) => r.filter((x) => x.distance >= minKm).reduce((a, x) => Math.min(a, paceOf(x)), Infinity);

export const BADGES: Badge[] = [
  { id: "first", title: "Back on the Road", desc: "Log your first run", emoji: "👟", test: (r) => r.length >= 1 },
  { id: "5k", title: "5K Club", desc: "Run 5 km in one go", emoji: "🎯", test: (r) => longest(r) >= 4.99 },
  { id: "7k", title: "Seven Up", desc: "Run 7 km in one go", emoji: "⚡", test: (r) => longest(r) >= 6.99 },
  { id: "8k", title: "Eight Strong", desc: "Run 8 km in one go", emoji: "💪", test: (r) => longest(r) >= 7.99 },
  { id: "10k", title: "Double Digits", desc: "Run 10 km in one go", emoji: "🏅", test: (r) => longest(r) >= 9.99 },
  { id: "half", title: "Half Hero", desc: "Run 21.1 km", emoji: "🦅", test: (r) => longest(r) >= 21.09 },
  { id: "sub7", title: "Sub-7 Engine", desc: "5 km+ under 7:00/km", emoji: "🔥", test: (r) => best(r, 4.99) < 420 },
  { id: "sub630", title: "Sub-6:30", desc: "5 km+ under 6:30/km", emoji: "🚀", test: (r) => best(r, 4.99) < 390 },
  { id: "sub6", title: "Sub-6 Flyer", desc: "5 km+ under 6:00/km", emoji: "🛩️", test: (r) => best(r, 4.99) < 360 },
  { id: "sub60", title: "Sub-60 10K", desc: "10 km under 60 minutes", emoji: "👑", test: (r) => r.some((x) => x.distance >= 9.99 && x.duration < 3600) },
  { id: "runs10", title: "Ten Down", desc: "Log 10 runs", emoji: "🔟", test: (r) => r.length >= 10 },
  { id: "runs25", title: "Quarter Century", desc: "Log 25 runs", emoji: "🎖️", test: (r) => r.length >= 25 },
  { id: "runs50", title: "Fifty Strong", desc: "Log 50 runs", emoji: "🏆", test: (r) => r.length >= 50 },
  { id: "km100", title: "Century", desc: "100 km total", emoji: "💯", test: (r) => summarize(r).distance >= 100 },
  { id: "km250", title: "250 Club", desc: "250 km total", emoji: "🌍", test: (r) => summarize(r).distance >= 250 },
  { id: "week25", title: "Big Week", desc: "25 km in a single week", emoji: "📈", test: (r) => allWeeks(r).some((w) => w.distance >= 25) },
  { id: "week30", title: "Thirty Week", desc: "30 km in a single week", emoji: "🧨", test: (r) => allWeeks(r).some((w) => w.distance >= 30) },
  { id: "streak5", title: "On a Roll", desc: "Run 5 days in a row", emoji: "🔗", test: (r) => maxStreak(r) >= 5 },
  { id: "early", title: "Early Bird", desc: "Finish a run before 7 AM", emoji: "🌅", test: (r) => r.some((x) => Number(x.time.split(":")[0]) < 7) },
  { id: "goals5", title: "Plan Executor", desc: "Tick off 5 goals", emoji: "✅", test: (_r, g) => g.filter((x) => x.done).length >= 5 },
  { id: "goals20", title: "Mission Mode", desc: "Tick off 20 goals", emoji: "🎖", test: (_r, g) => g.filter((x) => x.done).length >= 20 },
];

function maxStreak(runs: Run[]): number {
  const dates = [...new Set(runs.map((r) => r.date))].sort();
  let best = 0;
  for (const d of dates) best = Math.max(best, streak(runs, d));
  return best;
}

export const unlocked = (runs: Run[], goals: Goal[]) => BADGES.filter((b) => b.test(runs, goals)).map((b) => b.id);
