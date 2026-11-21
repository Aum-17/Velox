import type { Run, Goal } from "./types";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const pad = (n: number) => String(n).padStart(2, "0");

/* ---------- dates (always local, never UTC) ---------- */
export function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayISO(): string {
  return toISODate(new Date());
}
export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function addDays(d: string, n: number): string {
  const x = parseDate(d);
  x.setDate(x.getDate() + n);
  return toISODate(x);
}
/** 0 = Monday … 6 = Sunday */
export function dayIndex(d: string): number {
  return (parseDate(d).getDay() + 6) % 7;
}
export function weekStart(d: string): string {
  return addDays(d, -dayIndex(d));
}
export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}
export function fmtDate(d: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const x = parseDate(d);
  const s = `${x.getDate()} ${MONTHS[x.getMonth()]}`;
  const w = opts.weekday ? `${DAYS[dayIndex(d)]}, ` : "";
  return w + s + (opts.year ? ` ${x.getFullYear()}` : "");
}
export function fmtWeekRange(start: string): string {
  const end = addDays(start, 6);
  const a = parseDate(start), b = parseDate(end);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}
export function fmtTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${pad(m)} ${ap}`;
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";
export function dayPart(t: string): DayPart {
  const h = Number(t.split(":")[0]);
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}
export function runTitle(r: Run): string {
  if (r.type === "race") return "Race Day";
  const p = dayPart(r.time);
  const base = p.charAt(0).toUpperCase() + p.slice(1) + " Run";
  if (r.type === "long") return `Long ${base}`;
  if (r.type === "quality") return `${base} · Quality`;
  return base;
}

/* ---------- pace / duration ---------- */
export function parseDuration(s: string): number | null {
  const parts = s.trim().split(/[:.\s]+/).filter(Boolean).map(Number);
  if (!parts.length || parts.some((n) => isNaN(n) || n < 0)) return null;
  if (parts.length === 1) return Math.round(parts[0] * 60); // minutes
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}
export function fmtDuration(sec: number): string {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
export function fmtHours(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}
export const paceOf = (r: Pick<Run, "distance" | "duration">) => (r.distance > 0 ? r.duration / r.distance : 0);
export function fmtPace(secPerKm: number): string {
  if (!secPerKm || !isFinite(secPerKm)) return "–:––";
  const t = Math.round(secPerKm);
  return `${Math.floor(t / 60)}:${pad(t % 60)}`;
}
export const km = (n: number, d = 2) => String(parseFloat(n.toFixed(d)));
export const km1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

/** Riegel prediction */
export const predict = (timeSec: number, dist: number, target: number) => timeSec * Math.pow(target / dist, 1.06);

/* ---------- aggregation ---------- */
export interface WeekStat {
  key: string; // monday ISO
  label: string;
  runs: Run[];
  distance: number;
  duration: number;
  pace: number; // weighted avg sec/km
  longest: number;
  fastest: number;
  days: number[]; // km per day Mon..Sun
}
export function summarize(runs: Run[]) {
  const distance = runs.reduce((a, r) => a + r.distance, 0);
  const duration = runs.reduce((a, r) => a + r.duration, 0);
  return {
    count: runs.length,
    distance,
    duration,
    pace: distance ? duration / distance : 0,
    longest: runs.reduce((a, r) => Math.max(a, r.distance), 0),
    fastest: runs.reduce((a, r) => (a === 0 ? paceOf(r) : Math.min(a, paceOf(r))), 0),
  };
}
export function weekStat(runs: Run[], key: string): WeekStat {
  const wr = runs.filter((r) => weekStart(r.date) === key).sort(byDateAsc);
  const s = summarize(wr);
  const days = [0, 0, 0, 0, 0, 0, 0];
  wr.forEach((r) => (days[dayIndex(r.date)] += r.distance));
  return { key, label: fmtWeekRange(key), runs: wr, distance: s.distance, duration: s.duration, pace: s.pace, longest: s.longest, fastest: s.fastest, days };
}
/** all weeks from first run's week to current week, inclusive (empty weeks included) */
export function allWeeks(runs: Run[], until = todayISO()): WeekStat[] {
  if (!runs.length) return [weekStat(runs, weekStart(until))];
  const first = weekStart(runs.reduce((a, r) => (r.date < a ? r.date : a), runs[0].date));
  const lastRun = runs.reduce((a, r) => (r.date > a ? r.date : a), runs[0].date);
  const last = weekStart(lastRun > until ? lastRun : until);
  const out: WeekStat[] = [];
  for (let k = first; k <= last; k = addDays(k, 7)) out.push(weekStat(runs, k));
  return out;
}
export const byDateAsc = (a: Run, b: Run) => (a.date + a.time).localeCompare(b.date + b.time);
export const byDateDesc = (a: Run, b: Run) => (b.date + b.time).localeCompare(a.date + a.time);

export function streak(runs: Run[], today = todayISO()): number {
  const set = new Set(runs.map((r) => r.date));
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function weekStreak(weeks: WeekStat[]): number {
  let n = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].runs.length >= 3) n++;
    else if (i === weeks.length - 1) continue; // current week still in progress
    else break;
  }
  return n;
}

export function goalMet(g: Goal, r: Run): boolean {
  if (g.kind === "rest") return false;
  if (g.targetKm && r.distance < g.targetKm * 0.95) return false;
  if (g.targetPace && paceOf(r) > g.targetPace + 5) return false;
  return true;
}

export const RUN_TYPES: { id: import("./types").RunType; label: string; color: string }[] = [
  { id: "easy", label: "Easy", color: "#34d399" },
  { id: "quality", label: "Quality", color: "#fb923c" },
  { id: "long", label: "Long", color: "#60a5fa" },
  { id: "recovery", label: "Recovery", color: "#a78bfa" },
  { id: "race", label: "Race", color: "#f43f5e" },
];
export const typeMeta = (t: string) => RUN_TYPES.find((x) => x.id === t) ?? RUN_TYPES[0];
