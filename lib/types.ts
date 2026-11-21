export type RunType = "easy" | "quality" | "long" | "recovery" | "race";

export interface Run {
  id: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:MM (24h)
  distance: number; // km
  duration: number; // seconds
  type: RunType;
  feel?: number; // 1-5
  notes?: string;
  tags?: string[]; // e.g. "partner", "fasted", "new shoes"
  gps?: boolean;
}

export type GoalKind = "run" | "rest" | "quality" | "long" | "race" | "custom";

export interface Goal {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: GoalKind;
  targetKm?: number;
  targetPace?: number; // sec per km (optional)
  note?: string;
  done: boolean;
  doneAt?: string; // ISO
  linkedRunId?: string;
}

export interface Settings {
  athlete: string;
  weeklyKmGoal: number;
  easyPace: number; // sec/km — runs slower than this count as "easy zone"
  raceName: string;
  raceDate: string;
  raceDistance: number; // km
  raceTarget: number; // seconds
  ssbLabel: string;
  ssbDate: string;
}

export interface AppData {
  version: 1;
  runs: Run[];
  goals: Goal[];
  settings: Settings;
  seenBadges: string[];
  celebratedWeeks: string[]; // week keys where weekly-goal celebration already shown
}

export interface Celebration {
  id: string;
  title: string;
  subtitle?: string;
  kind: "goal" | "badge" | "week" | "pb" | "run";
  emoji?: string;
}
