"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Modal, Ring } from "./ui";
import { DAYS, DAYS_LONG, MONTHS, addDays, dayIndex, fmtDate, fmtPace, km, paceOf, todayISO, toISODate } from "@/lib/utils";
import type { GoalKind } from "@/lib/types";

const KINDS: { id: GoalKind; label: string; color: string; emoji: string }[] = [
  { id: "run", label: "Easy run", color: "#34d399", emoji: "🏃" },
  { id: "quality", label: "Quality", color: "#fb923c", emoji: "⚡" },
  { id: "long", label: "Long run", color: "#60a5fa", emoji: "🛣️" },
  { id: "rest", label: "Rest", color: "#a1a1aa", emoji: "🧘" },
  { id: "race", label: "Race", color: "#f43f5e", emoji: "🏁" },
  { id: "custom", label: "Custom", color: "#a78bfa", emoji: "⭐" },
];
const kindOf = (k: string) => KINDS.find((x) => x.id === k) ?? KINDS[0];
const TEMPLATES: { title: string; kind: GoalKind; km?: number }[] = [
  { title: "Easy run", kind: "run", km: 5 },
  { title: "Intervals 6 × 400 m", kind: "quality", km: 5 },
  { title: "Tempo run", kind: "quality", km: 5 },
  { title: "Long run", kind: "long", km: 8 },
  { title: "Rest day", kind: "rest" },
  { title: "1.6 km time trial", kind: "quality", km: 1.6 },
  { title: "Strides 6 × 20 s", kind: "custom" },
];

export function Goals() {
  const { data, addGoal, toggleGoal, deleteGoal } = useStore();
  const today = todayISO();
  const [sel, setSel] = useState(today);
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "done" | "missed">("upcoming");

  const cells = useMemo(() => {
    const first = `${month}-01`;
    const start = addDays(first, -dayIndex(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [month]);

  const goals = data.goals;
  const runsByDate = useMemo(() => {
    const m: Record<string, number> = {};
    data.runs.forEach((r) => (m[r.date] = (m[r.date] ?? 0) + r.distance));
    return m;
  }, [data.runs]);

  const dayGoals = goals.filter((g) => g.date === sel);
  const dayRuns = data.runs.filter((r) => r.date === sel);
  const done = goals.filter((g) => g.done).length;
  const past = goals.filter((g) => g.date < today);
  const missed = past.filter((g) => !g.done && g.kind !== "rest");
  const list = (filter === "upcoming" ? goals.filter((g) => g.date >= today && !g.done) : filter === "done" ? goals.filter((g) => g.done) : missed)
    .sort((a, b) => (filter === "done" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  const [y, mo] = month.split("-").map(Number);
  const shift = (n: number) => { const d = new Date(y, mo - 1 + n, 1); setMonth(toISODate(d).slice(0, 7)); };

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Goals</h1>
          <p>Plan sessions ahead on any date, then tick them off when they&apos;re done.</p>
        </div>
        <button className="btn primary" onClick={() => setOpen(true)}><Plus size={16} /> New goal</button>
      </div>

      <div className="grid g3">
        <div className="glass card span2">
          <div className="card-h">
            <button className="btn icon" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 22, textTransform: "uppercase" }}>{MONTHS[mo - 1]} {y}</h3>
            <div className="row" style={{ gap: 6 }}>
              {month !== today.slice(0, 7) && <button className="btn sm ghost" onClick={() => { setMonth(today.slice(0, 7)); setSel(today); }}>Today</button>}
              <button className="btn icon" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
          </div>
          <div className="cal">
            {DAYS.map((d) => <div key={d} className="h">{d}</div>)}
            {cells.map((d) => {
              const gs = goals.filter((g) => g.date === d);
              const ran = runsByDate[d];
              return (
                <motion.button key={d} whileTap={{ scale: 0.92 }} className={`cday ${d.slice(0, 7) !== month ? "out" : ""} ${d === today ? "today" : ""} ${d === sel ? "sel" : ""}`} onClick={() => setSel(d)}>
                  <span>{Number(d.slice(8))}</span>
                  {ran ? <span style={{ fontSize: 10, color: "#ffb48f", fontWeight: 700 }}>{km(ran, 1)}k</span> : null}
                  <span className="dots">
                    {gs.slice(0, 3).map((g) => <i key={g.id} style={{ background: g.done ? "#30d158" : kindOf(g.kind).color, opacity: g.done ? 1 : 0.85 }} />)}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 12, gap: 12, fontSize: 12, color: "var(--text-3)" }}>
            {KINDS.map((k) => <span key={k.id} className="row" style={{ gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 8, background: k.color, display: "inline-block" }} />{k.label}</span>)}
            <span className="row" style={{ gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 8, background: "#30d158", display: "inline-block" }} />Done</span>
          </div>
        </div>

        <div className="glass card">
          <div className="card-h">
            <div>
              <div className="eyebrow">{sel === today ? "Today" : sel < today ? "Past" : "Planned"}</div>
              <h3 style={{ fontSize: 18 }}>{DAYS_LONG[dayIndex(sel)]}, {fmtDate(sel, { year: true })}</h3>
            </div>
            <button className="btn sm" onClick={() => setOpen(true)}><Plus size={14} /> Add</button>
          </div>
          <div className="grid" style={{ gap: 8 }}>
            <AnimatePresence>
              {dayGoals.map((g) => <GoalRow key={g.id} id={g.id} />)}
            </AnimatePresence>
            {dayGoals.length === 0 && <div className="empty" style={{ padding: 18 }}>No goals on this day.</div>}
          </div>
          {dayRuns.length > 0 && (
            <>
              <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Logged runs</div>
              {dayRuns.map((r) => (
                <div key={r.id} className="row" style={{ justifyContent: "space-between", fontSize: 14, padding: "6px 0" }}>
                  <span>🏃 {km(r.distance)} km</span><span style={{ color: "#ffb48f", fontWeight: 600 }}>{fmtPace(paceOf(r))}/km</span>
                </div>
              ))}
            </>
          )}
          <div className="eyebrow" style={{ margin: "16px 0 8px" }}>Quick add for this day</div>
          <div className="chips">
            {TEMPLATES.slice(0, 5).map((t) => (
              <button key={t.title} className="chip" onClick={() => addGoal({ date: sel, title: t.km ? `${t.title} ${t.km} km` : t.title, kind: t.kind, targetKm: t.km })}>
                {kindOf(t.kind).emoji} {t.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g3 section">
        <div className="glass card" style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <Ring pct={past.length ? past.filter((g) => g.done).length / past.length : 0} size={120}>
            <div><b>{past.length ? Math.round((past.filter((g) => g.done).length / past.length) * 100) : 0}%</b><span>hit rate</span></div>
          </Ring>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <div><b style={{ fontSize: 20 }}>{done}</b> <span className="muted">completed</span></div>
            <div><b style={{ fontSize: 20 }}>{goals.filter((g) => g.date >= today && !g.done).length}</b> <span className="muted">upcoming</span></div>
            <div><b style={{ fontSize: 20 }}>{missed.length}</b> <span className="muted">missed</span></div>
          </div>
        </div>
        <div className="glass card span2">
          <div className="card-h">
            <h3><Target size={17} /> Goal list</h3>
            <div className="seg">
              {(["upcoming", "done", "missed"] as const).map((f) => <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>)}
            </div>
          </div>
          <div className="grid" style={{ gap: 8, maxHeight: 380, overflowY: "auto" }}>
            <AnimatePresence>{list.map((g) => <GoalRow key={g.id} id={g.id} showDate onPick={() => { setSel(g.date); setMonth(g.date.slice(0, 7)); }} />)}</AnimatePresence>
            {list.length === 0 && <div className="empty">Nothing here.</div>}
          </div>
        </div>
      </div>

      <GoalForm open={open} onClose={() => setOpen(false)} date={sel} onSave={(g) => { addGoal(g); setSel(g.date); }} />
    </div>
  );
}

function GoalRow({ id, showDate, onPick }: { id: string; showDate?: boolean; onPick?: () => void }) {
    const { data, toggleGoal, deleteGoal } = useStore();
    const g = data.goals.find((x) => x.id === id);
    if (!g) return null;
    const k = kindOf(g.kind);
    const linked = g.linkedRunId ? data.runs.find((r) => r.id === g.linkedRunId) : undefined;
    return (
      <motion.div layout className={`goal ${g.done ? "done" : ""}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 30 }}>
        <motion.button whileTap={{ scale: 0.75 }} className={`check ${g.done ? "on" : ""}`} onClick={() => toggleGoal(g.id)} aria-label={g.done ? "Mark not done" : "Mark done"}>
          <AnimatePresence>{g.done && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={16} /></motion.span>}</AnimatePresence>
        </motion.button>
        <div style={{ flex: 1, minWidth: 0, cursor: onPick ? "pointer" : undefined }} onClick={onPick}>
          <div className="gt">{k.emoji} {g.title}</div>
          <div className="gs">
            {showDate && <>{fmtDate(g.date, { weekday: true })} · </>}
            {g.targetKm ? `${g.targetKm} km` : k.label}
            {g.targetPace ? ` @ ${fmtPace(g.targetPace)}/km` : ""}
            {g.note ? ` · ${g.note}` : ""}
            {linked ? ` · auto-completed by ${km(linked.distance)} km run` : ""}
          </div>
        </div>
        <button className="btn icon ghost danger" onClick={() => deleteGoal(g.id)} aria-label="Delete goal"><Trash2 size={15} /></button>
      </motion.div>
    );
}

function GoalForm({ open, onClose, date, onSave }: { open: boolean; onClose: () => void; date: string; onSave: (g: { date: string; title: string; kind: GoalKind; targetKm?: number; targetPace?: number; note?: string }) => void }) {
  const [d, setD] = useState(date);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<GoalKind>("run");
  const [tkm, setTkm] = useState("");
  const [tpace, setTpace] = useState("");
  const [note, setNote] = useState("");
  const [repeat, setRepeat] = useState(1);
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) { setLastOpen(true); setD(date); }
  if (!open && lastOpen) setLastOpen(false);

  const save = () => {
    const kmv = parseFloat(tkm);
    const [pm, ps = "0"] = tpace.split(":");
    const pv = tpace ? Number(pm) * 60 + Number(ps) : undefined;
    const t = title.trim() || (kind === "rest" ? "Rest day" : `${kindOf(kind).label}${kmv ? ` ${kmv} km` : ""}`);
    for (let i = 0; i < repeat; i++) onSave({ date: addDays(d, i * 7), title: t, kind, targetKm: kmv > 0 ? kmv : undefined, targetPace: pv && !isNaN(pv) ? pv : undefined, note: note.trim() || undefined });
    setTitle(""); setTkm(""); setTpace(""); setNote(""); setRepeat(1);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New goal">
      <div className="form-grid">
        <div className="field full">
          <label>Templates</label>
          <div className="chips">
            {TEMPLATES.map((t) => <button key={t.title} className="chip" onClick={() => { setTitle(t.km ? `${t.title} ${t.km} km` : t.title); setKind(t.kind); setTkm(t.km ? String(t.km) : ""); }}>{kindOf(t.kind).emoji} {t.title}</button>)}
          </div>
        </div>
        <div className="field full">
          <label>Goal</label>
          <input className="input" placeholder="e.g. Long run 9 km" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="field full">
          <label>Type</label>
          <div className="chips">{KINDS.map((k) => <button key={k.id} className={`chip ${kind === k.id ? "on" : ""}`} onClick={() => setKind(k.id)}>{k.emoji} {k.label}</button>)}</div>
        </div>
        <div className="field">
          <label>Date · {DAYS_LONG[dayIndex(d)]}</label>
          <input className="input" type="date" value={d} onChange={(e) => e.target.value && setD(e.target.value)} />
        </div>
        <div className="field">
          <label>Repeat weekly</label>
          <select className="input" value={repeat} onChange={(e) => setRepeat(Number(e.target.value))}>
            {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n === 1 ? "Just once" : `${n} weeks`}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Target distance (km)</label>
          <input className="input" inputMode="decimal" placeholder="optional" value={tkm} onChange={(e) => setTkm(e.target.value)} />
        </div>
        <div className="field">
          <label>Target pace (min/km)</label>
          <input className="input" placeholder="optional, e.g. 6:40" value={tpace} onChange={(e) => setTpace(e.target.value)} />
        </div>
        <div className="field full">
          <label>Note</label>
          <input className="input" placeholder="Warm-up 1.5 km, keep it conversational…" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <p className="full muted" style={{ fontSize: 12.5, margin: 0 }}>Goals with a target distance tick themselves off automatically when you log a run on that date that meets it.</p>
        <div className="full row" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Add goal{repeat > 1 ? ` × ${repeat}` : ""}</button>
        </div>
      </div>
    </Modal>
  );
}
