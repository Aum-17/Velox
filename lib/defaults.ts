import type { AppData } from "./types";

/** A brand-new account: zero runs, zero goals, nothing borrowed from anyone else. */
export function blankData(name = "Runner"): AppData {
  return {
    version: 1,
    runs: [],
    goals: [],
    settings: {
      athlete: name.split(" ")[0] || "Runner",
      weeklyKmGoal: 20,
      easyPace: 450, // 7:30/km
      raceName: "",
      raceDate: "",
      raceDistance: 10,
      raceTarget: 60 * 60,
      ssbLabel: "",
      ssbDate: "",
    },
    seenBadges: [],
    celebratedWeeks: [],
  };
}
