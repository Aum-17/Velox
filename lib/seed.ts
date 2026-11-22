import "server-only";
import type { AppData, Goal, Run, RunType } from "./types";

// The owner's original run log (carried over from the coaching chat).
// SERVER-ONLY: served exclusively to OWNER_EMAIL by app/api/data — never bundled into the browser.
// Runs 1–25 had no exact dates in the chat, so their dates are reconstructed estimates.
type Row = [string, string, number, string, RunType, string?, string[]?];
const rows: Row[] = [
  ["2026-10-08", "18:30", 3.22, "25:45", "easy", "First run back after 5 months"],
  ["2026-10-09", "18:30", 4.07, "29:27", "easy"],
  ["2026-10-10", "18:00", 4.06, "31:00", "easy"],
  ["2026-10-11", "18:00", 5.0, "39:46", "long", "First 5K back — muscle memory kicked in"],
  ["2026-10-12", "18:15", 4.07, "31:37", "easy", "Legs a bit heavy after the 5K"],
  ["2026-10-14", "18:15", 4.02, "32:53", "easy", "After an extra rest day"],
  ["2026-10-16", "18:00", 5.0, "36:41", "easy"],
  ["2026-10-17", "18:00", 5.5, "45:56", "recovery", "With a slower partner", ["partner"]],
  ["2026-10-18", "06:30", 5.18, "39:30", "easy", "Morning fasted run", ["fasted"]],
  ["2026-10-19", "18:00", 4.0, "30:03", "easy"],
  ["2026-10-20", "18:00", 3.0, "21:20", "quality"],
  ["2026-10-21", "18:00", 6.03, "44:30", "long", "First 6K"],
  ["2026-10-23", "18:00", 5.08, "38:48", "easy"],
  ["2026-10-24", "18:00", 4.32, "30:41", "quality"],
  ["2026-10-25", "18:00", 3.0, "23:27", "recovery", "Recovery with a partner", ["partner"]],
  ["2026-10-26", "18:00", 5.0, "36:08", "easy"],
  ["2026-10-27", "18:00", 3.62, "26:37", "easy"],
  ["2026-10-28", "18:00", 6.02, "41:13", "long", "New shoes — medium easy", ["new shoes"]],
  ["2026-10-30", "18:00", 5.0, "32:52", "quality"],
  ["2026-10-31", "18:00", 4.2, "28:06", "quality"],
  ["2026-11-03", "18:00", 5.0, "40:22", "recovery", "Easy return, proper warm-up"],
  ["2026-11-04", "18:00", 3.5, "30:14", "easy", "Phase 1 — calm & controlled"],
  ["2026-11-06", "18:00", 5.09, "32:01", "quality", "Fastest 5K on record"],
  ["2026-11-07", "18:00", 3.25, "21:44", "quality"],
  ["2026-11-08", "18:00", 7.0, "47:32", "long", "First 7K"],
  ["2026-11-09", "18:00", 5.0, "35:46", "easy", "Week 1 begins"],
  ["2026-11-10", "18:00", 6.0, "39:30", "quality", "Week 1 quality run"],
  ["2026-11-11", "18:00", 4.57, "32:57", "easy"],
  ["2026-11-15", "18:00", 7.01, "51:54", "long", "Week 1 long run — after 3 rest days"],
  ["2026-11-16", "18:00", 4.08, "29:50", "easy", "Week 2 opener"],
  ["2026-11-18", "18:00", 4.05, "26:30", "quality", "Week 2 quality — at 10K target pace"],
  ["2026-11-19", "18:00", 4.7, "31:50", "easy"],
];

const toSec = (s: string) => {
  const [m, sec] = s.split(":").map(Number);
  return m * 60 + sec;
};

export const seedRuns: Run[] = rows.map(([date, time, distance, dur, type, notes, tags], i) => ({
  id: `seed-${i + 1}`,
  date,
  time,
  distance,
  duration: toSec(dur),
  type,
  notes,
  tags: [...(tags ?? []), ...(i < 25 ? ["est. date"] : [])],
}));

type G = [string, string, Goal["kind"], number?, number?, string?];
const plan: G[] = [
  // Week 3 — Nov 23–29
  ["2026-11-23", "Easy run", "run", 4.5, undefined, "7:30/km or slower"],
  ["2026-11-24", "Intervals 4 × 1 km @ 6:30", "quality", 6.5, undefined, "1.5 km warm-up, 2 min jog between, 1 km cool-down"],
  ["2026-11-25", "Easy run", "run", 4],
  ["2026-11-26", "Rest day", "rest", undefined, undefined, "Calf raises 3 × 12"],
  ["2026-11-27", "Easy run", "run", 4.5],
  ["2026-11-28", "Rest day", "rest"],
  ["2026-11-29", "Long run 9 km", "long", 9, undefined, "7:15–7:30/km, conversational"],
  // Week 4 — Nov 30–Dec 6
  ["2026-11-30", "Easy run", "run", 4],
  ["2026-12-01", "Tempo: 3 km @ 6:40 inside 5 km", "quality", 5],
  ["2026-12-02", "Easy run", "run", 5],
  ["2026-12-03", "Rest day", "rest"],
  ["2026-12-04", "Easy run", "run", 5],
  ["2026-12-06", "Long run 10 km (peak)", "long", 10, undefined, "Peak long run before the race"],
  // Week 5 — Dec 7–13
  ["2026-12-07", "Easy run", "run", 4],
  ["2026-12-08", "3 × 1.5 km @ 6:40 race pace", "quality", 6],
  ["2026-12-09", "Easy run", "run", 4],
  ["2026-12-10", "Rest day", "rest"],
  ["2026-12-11", "Easy run", "run", 4],
  ["2026-12-13", "Long run 7 km", "long", 7],
  // Week 6 — race week
  ["2026-12-14", "Easy 3 km", "run", 3],
  ["2026-12-16", "Easy 3 km + 4 × 20s strides", "run", 3],
  ["2026-12-20", "RACE DAY — 10K", "race", 10, 393, "Start at 6:40/km, push after 7 km"],
];

export const seedGoals: Goal[] = plan.map(([date, title, kind, targetKm, targetPace, note], i) => ({
  id: `plan-${i + 1}`,
  date,
  title,
  kind,
  targetKm,
  targetPace,
  note,
  done: false,
}));

export function seedData(): AppData {
  return {
    version: 1,
    runs: seedRuns,
    goals: seedGoals,
    settings: {
      athlete: "Runner", // replaced with the account name on first load
      weeklyKmGoal: 22,
      easyPace: 450, // 7:30/km
      raceName: "10K Race",
      raceDate: "2026-12-20",
      raceDistance: 10,
      raceTarget: 65 * 60 + 30,
      ssbLabel: "SSB",
      ssbDate: "2027-04-01",
    },
    seenBadges: [],
    celebratedWeeks: ["2026-11-09", "2026-11-16"],
  };
}
