"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AppData, Celebration, Goal, Run, Settings } from "./types";
import { blankData } from "./defaults";
import { BADGES, unlocked } from "./badges";
import { fmtPace, goalMet, km, paceOf, summarize, uid, weekStart, weekStat } from "./utils";

const OLD_KEY = "velox:data:v1"; // pre-accounts localStorage copy; wiped so it can't leak into another account

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
  isOwner: boolean;
  syncState: "idle" | "saving" | "error";
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
  return blankData();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(initial);
  const [ready, setReady] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [runDraft, setRunDraft] = useState<Partial<Run> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef(data);
  ref.current = data;

  const [isOwner, setIsOwner] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "error">("idle");
  const loaded = useRef<string | null>(null); // JSON of the last server copy, to skip no-op saves

  const adopt = (raw: AppData) => {
    const base = initial();
    const d: AppData = { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
    if (!raw.seenBadges) d.seenBadges = unlocked(d.runs, d.goals);
    loaded.current = JSON.stringify(d);
    ref.current = d;
    setData(d);
  };

  // Load this account's data from the server
  useEffect(() => {
    try { localStorage.removeItem(OLD_KEY); } catch {}
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        if (res.status === 401) { window.location.href = "/login"; return; }
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as { data: AppData; owner: boolean };
        if (cancelled) return;
        adopt(j.data);
        setIsOwner(j.owner);
        setReady(true);
      } catch {
        if (!cancelled) { setSyncState("error"); setReady(true); setToast("Couldn't load your data. Check your connection and refresh."); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save changes back (debounced)
  useEffect(() => {
    if (!ready || loaded.current === null) return;
    const body = JSON.stringify(data);
    if (body === loaded.current) return;
    setSyncState("saving");
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/data", { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive: body.length < 60000 });
        if (!res.ok) throw new Error(String(res.status));
        loaded.current = body;
        setSyncState("idle");
      } catch {
        setSyncState("error");
      }
    }, 700);
    return () => window.clearTimeout(t);
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
  const resetData = async () => {
    try {
      const res = await fetch("/api/data", { method: "DELETE" });
      if (!res.ok) throw new Error();
      const j = (await res.json()) as { data: AppData; owner: boolean };
      adopt(j.data);
      showToast(j.owner ? "Reset to original log" : "All data cleared");
    } catch { showToast("Reset failed. Try again."); }
  };

  const value: Store = {
    data, ready, addRun, updateRun, deleteRun, addGoal, updateGoal, toggleGoal, deleteGoal, updateSettings, importData, resetData, isOwner, syncState,
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
