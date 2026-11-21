"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppData, Celebration, Goal, Run, Settings } from "./types";
import { seedData } from "./seed";
import { BADGES, unlocked } from "./badges";
import { fmtPace, goalMet, km, paceOf, summarize, uid, weekStart, weekStat } from "./utils";

const KEY = "velox:data:v1";

interface Store {
  data: AppData;
  ready: boolean;
  addRun: (r: Omit<Run, "id">) => void;
  updateRun: (r: Run) => void;
  deleteRun: (id: string) => void;
  addGoal: (g: Omit<Goal, "id" | "done">) => void;
  updateGoal: (g: Goal) => void;
  toggleGoal: (id: string) => void;
  deleteGoal: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  importData: (d: AppData) => void;
  resetData: () => void;
  celebrations: Celebration[];
  dismissCelebration: () => void;
  celebrate: (c: Omit<Celebration, "id">) => void;
  // UI bridges
  runDraft: Partial<Run> | null;
  openRunForm: (draft?: Partial<Run>) => void;
  closeRunForm: () => void;
  toast: string | null;
  showToast: (t: string) => void;
}

const Ctx = createContext<Store | null>(null);

function initial(): AppData {
  const d = seedData();
  d.seenBadges = unlocked(d.runs, d.goals);
  return d;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initial);
  const [ready, setReady] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [runDraft, setRunDraft] = useState<Partial<Run> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppData;
        if (parsed && Array.isArray(parsed.runs)) {
          const merged = { ...initial(), ...parsed, settings: { ...initial().settings, ...parsed.settings } };
          setData(merged);
          ref.current = merged;
        }
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }, [data, ready]);

  const commit = (next: AppData) => { ref.current = next; setData(next); };
  const celebrate = useCallback((c: Omit<Celebration, "id">) => setCelebrations((q) => [...q, { ...c, id: uid() }]), []);
  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 2600);
  }, []);

  /** After any change: detect newly earned badges and weekly-goal crossings */
  const settle = (prev: AppData, next: AppData, touchedWeek?: string) => {
    const queue: Omit<Celebration, "id">[] = [];
    const now = unlocked(next.runs, next.goals);
    const fresh = now.filter((id) => !next.seenBadges.includes(id));
    fresh.forEach((id) => {
      const b = BADGES.find((x) => x.id === id)!;
      queue.push({ kind: "badge", title: `Badge unlocked: ${b.title}`, subtitle: b.desc, emoji: b.emoji });
    });
    next = { ...next, seenBadges: [...new Set([...next.seenBadges, ...fresh])] };
    if (touchedWeek && !next.celebratedWeeks.includes(touchedWeek)) {
      const before = weekStat(prev.runs, touchedWeek).distance;
      const after = weekStat(next.runs, touchedWeek).distance;
      const goal = next.settings.weeklyKmGoal;
      if (before < goal && after >= goal) {
        queue.push({ kind: "week", title: "Weekly goal smashed!", subtitle: `${km(after, 1)} km this week — target was ${goal} km`, emoji: "🏁" });
        next = { ...next, celebratedWeeks: [...next.celebratedWeeks, touchedWeek] };
      }
    }
    commit(next);
    queue.forEach((c) => celebrate(c));
  };

  const addRun = (r: Omit<Run, "id">) => {
    const prev = ref.current;
    const run: Run = { ...r, id: uid() };
    const queue: Omit<Celebration, "id">[] = [];
    // PB checks
    const s = summarize(prev.runs);
    if (prev.runs.length && run.distance > s.longest + 0.01)
      queue.push({ kind: "pb", title: "New distance PB!", subtitle: `${km(run.distance)} km — your longest run yet`, emoji: "📏" });
    const best5 = prev.runs.filter((x) => x.distance >= 4.99).reduce((a, x) => Math.min(a, paceOf(x)), Infinity);
    if (run.distance >= 4.99 && paceOf(run) < best5)
      queue.push({ kind: "pb", title: "Fastest 5K+ pace ever!", subtitle: `${fmtPace(paceOf(run))}/km over ${km(run.distance)} km`, emoji: "⚡" });
    // auto-complete matching goals on that date
    let linked = false;
    const goals = prev.goals.map((g) => {
      if (!linked && !g.done && g.date === run.date && goalMet(g, run)) {
        linked = true;
        queue.push({ kind: "goal", title: "Goal complete!", subtitle: g.title, emoji: "🎯" });
        return { ...g, done: true, doneAt: new Date().toISOString(), linkedRunId: run.id };
      }
      return g;
    });
    if (!queue.length) queue.push({ kind: "run", title: "Run logged. Nice work!", subtitle: `${km(run.distance)} km at ${fmtPace(paceOf(run))}/km`, emoji: "🏃" });
    settle(prev, { ...prev, runs: [...prev.runs, run], goals }, weekStart(run.date));
    queue.forEach((c) => celebrate(c));
  };

  const updateRun = (r: Run) => {
    const prev = ref.current;
    settle(prev, { ...prev, runs: prev.runs.map((x) => (x.id === r.id ? r : x)) }, weekStart(r.date));
    showToast("Run updated");
  };
  const deleteRun = (id: string) => {
    const prev = ref.current;
    commit({ ...prev, runs: prev.runs.filter((x) => x.id !== id), goals: prev.goals.map((g) => (g.linkedRunId === id ? { ...g, linkedRunId: undefined } : g)) });
    showToast("Run deleted");
  };
  const addGoal = (g: Omit<Goal, "id" | "done">) => {
    const prev = ref.current;
    commit({ ...prev, goals: [...prev.goals, { ...g, id: uid(), done: false }] });
    showToast("Goal added");
  };
  const updateGoal = (g: Goal) => {
    const prev = ref.current;
    commit({ ...prev, goals: prev.goals.map((x) => (x.id === g.id ? g : x)) });
  };
  const toggleGoal = (id: string) => {
    const prev = ref.current;
    const g = prev.goals.find((x) => x.id === id);
    if (!g) return;
    const done = !g.done;
    const next = { ...prev, goals: prev.goals.map((x) => (x.id === id ? { ...x, done, doneAt: done ? new Date().toISOString() : undefined } : x)) };
    if (done) {
      settle(prev, next);
      celebrate({ kind: "goal", title: g.kind === "rest" ? "Recovery banked!" : "Goal complete!", subtitle: g.title, emoji: g.kind === "rest" ? "🧘" : g.kind === "race" ? "🏆" : "🎯" });
    } else commit(next);
  };
  const deleteGoal = (id: string) => {
    const prev = ref.current;
    commit({ ...prev, goals: prev.goals.filter((x) => x.id !== id) });
    showToast("Goal removed");
  };
  const updateSettings = (s: Partial<Settings>) => {
    const prev = ref.current;
    commit({ ...prev, settings: { ...prev.settings, ...s } });
  };
  const importData = (d: AppData) => {
    const base = initial();
    commit({ ...base, ...d, settings: { ...base.settings, ...d.settings } });
    showToast("Backup restored");
  };
  const resetData = () => { commit(initial()); showToast("Reset to original log"); };

  const value: Store = {
    data, ready, addRun, updateRun, deleteRun, addGoal, updateGoal, toggleGoal, deleteGoal, updateSettings, importData, resetData,
    celebrations, dismissCelebration: () => setCelebrations((q) => q.slice(1)), celebrate,
    runDraft, openRunForm: (d) => setRunDraft(d ?? {}), closeRunForm: () => setRunDraft(null),
    toast, showToast,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
