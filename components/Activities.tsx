"use client";
import { AnimatePresence } from "framer-motion";
import { Filter, LayoutGrid, List, RotateCcw, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ActivityCard, TypeTag } from "./ui";
import { DAYS, RUN_TYPES, dayIndex, dayPart, fmtDate, fmtDuration, fmtPace, fmtTime12, km, km1, paceOf, summarize, todayISO, addDays, weekStart, type DayPart } from "@/lib/utils";
import type { Run } from "@/lib/types";

type SortKey = "date" | "distance" | "pace" | "duration";
const PARTS: { id: DayPart; label: string }[] = [
  { id: "morning", label: "🌅 Morning" },
  { id: "afternoon", label: "☀️ Afternoon" },
  { id: "evening", label: "🌇 Evening" },
  { id: "night", label: "🌙 Night" },
];
const PRESETS = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "last", label: "Last week" },
  { id: "30", label: "30 days" },
  { id: "custom", label: "Custom" },
];

function paceToSec(s: string): number | null {
  if (!s.trim()) return null;
  const [m, sec = "0"] = s.split(":");
  const v = Number(m) * 60 + Number(sec);
  return isNaN(v) ? null : v;
}

export function Activities() {
  const { data, openRunForm, deleteRun } = useStore();
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [parts, setParts] = useState<DayPart[]>([]);
  const [paceMin, setPaceMin] = useState("");
  const [paceMax, setPaceMax] = useState("");
  const [distMin, setDistMin] = useState("");
  const [preset, setPreset] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [showFilters, setShowFilters] = useState(true);
  const [confirm, setConfirm] = useState<string | null>(null);

  const today = todayISO();
  const range = useMemo((): [string, string] => {
    if (preset === "week") return [weekStart(today), addDays(weekStart(today), 6)];
    if (preset === "last") return [addDays(weekStart(today), -7), addDays(weekStart(today), -1)];
    if (preset === "30") return [addDays(today, -29), today];
    if (preset === "custom") return [from || "0000", to || "9999"];
    return ["0000", "9999"];
  }, [preset, from, to, today]);

  const list = useMemo(() => {
    const pMin = paceToSec(paceMin), pMax = paceToSec(paceMax), dMin = parseFloat(distMin);
    const ql = q.trim().toLowerCase();
    const out = data.runs.filter((r) => {
      const p = paceOf(r);
      if (types.length && !types.includes(r.type)) return false;
      if (days.length && !days.includes(dayIndex(r.date))) return false;
      if (parts.length && !parts.includes(dayPart(r.time))) return false;
      if (pMin && p < pMin) return false;
      if (pMax && p > pMax + 0.5) return false;
      if (dMin && r.distance < dMin) return false;
      if (r.date < range[0] || r.date > range[1]) return false;
      if (ql && !`${r.notes ?? ""} ${r.tags?.join(" ") ?? ""} ${r.type} ${fmtDate(r.date)} ${DAYS[dayIndex(r.date)]}`.toLowerCase().includes(ql)) return false;
      return true;
    });
    const val = (r: Run) => (sort === "date" ? r.date + r.time : sort === "distance" ? r.distance : sort === "pace" ? paceOf(r) : r.duration);
    out.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return asc ? c : -c;
    });
    return out;
  }, [data.runs, q, types, days, parts, paceMin, paceMax, distMin, range, sort, asc]);

  const s = summarize(list);
  const active = types.length + days.length + parts.length + (paceMin ? 1 : 0) + (paceMax ? 1 : 0) + (distMin ? 1 : 0) + (preset !== "all" ? 1 : 0) + (q ? 1 : 0);
  const reset = () => { setQ(""); setTypes([]); setDays([]); setParts([]); setPaceMin(""); setPaceMax(""); setDistMin(""); setPreset("all"); setFrom(""); setTo(""); };
  const tog = <T,>(arr: T[], v: T, set: (x: T[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const sortBy = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(k === "pace"); } };
  const arrow = (k: SortKey) => (sort === k ? (asc ? " ↑" : " ↓") : "");

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Activities</h1>
          <p>Every run you&apos;ve logged. Filter by pace, day, date or time of day.</p>
        </div>
        <div className="row">
          <div className="seg">
            <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")} aria-label="Card view"><LayoutGrid size={15} /></button>
            <button className={view === "table" ? "on" : ""} onClick={() => setView("table")} aria-label="Table view"><List size={15} /></button>
          </div>
          <button className="btn" onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> Filters{active ? ` · ${active}` : ""}</button>
          <button className="btn primary" onClick={() => openRunForm()}><Plus size={16} /> Add</button>
        </div>
      </div>

      {showFilters && (
        <div className="glass card" style={{ display: "grid", gap: 14 }}>
          <div className="row">
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: "var(--text-3)" }} />
              <input className="input" style={{ paddingLeft: 36 }} placeholder="Search notes, tags, day…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="input" style={{ width: "auto" }} value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Date range">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {preset === "custom" && <>
              <input className="input" style={{ width: "auto" }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
              <input className="input" style={{ width: "auto" }} type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
            </>}
            {active > 0 && <button className="btn ghost sm" onClick={reset}><RotateCcw size={14} /> Reset</button>}
          </div>
          <div className="row" style={{ alignItems: "flex-start", gap: 18 }}>
            <div className="field"><label>Day of week</label>
              <div className="chips">{DAYS.map((d, i) => <button key={d} className={`chip ${days.includes(i) ? "on" : ""}`} onClick={() => tog(days, i, setDays)}>{d}</button>)}</div>
            </div>
            <div className="field"><label>Time of day</label>
              <div className="chips">{PARTS.map((p) => <button key={p.id} className={`chip ${parts.includes(p.id) ? "on" : ""}`} onClick={() => tog(parts, p.id, setParts)}>{p.label}</button>)}</div>
            </div>
          </div>
          <div className="row" style={{ alignItems: "flex-start", gap: 18 }}>
            <div className="field"><label>Run type</label>
              <div className="chips">{RUN_TYPES.map((t) => <button key={t.id} className={`chip ${types.includes(t.id) ? "on" : ""}`} onClick={() => tog(types, t.id, setTypes)}><span style={{ width: 8, height: 8, borderRadius: 9, background: t.color }} />{t.label}</button>)}</div>
            </div>
            <div className="field"><label>Pace range (min/km)</label>
              <div className="row" style={{ gap: 6 }}>
                <input className="input" style={{ width: 92 }} placeholder="6:00" value={paceMin} onChange={(e) => setPaceMin(e.target.value)} aria-label="Fastest pace" />
                <span className="muted">to</span>
                <input className="input" style={{ width: 92 }} placeholder="7:30" value={paceMax} onChange={(e) => setPaceMax(e.target.value)} aria-label="Slowest pace" />
              </div>
            </div>
            <div className="field"><label>Min distance (km)</label>
              <input className="input" style={{ width: 100 }} placeholder="5" inputMode="decimal" value={distMin} onChange={(e) => setDistMin(e.target.value)} />
            </div>
          </div>
          <div className="chips">
            {[["Under 6:30", "", "6:30"], ["6:30–7:00", "6:30", "7:00"], ["7:00–7:30", "7:00", "7:30"], ["Easy 7:30+", "7:30", ""]].map(([l, a, b]) => (
              <button key={l} className={`chip ${paceMin === a && paceMax === b ? "on" : ""}`} onClick={() => { setPaceMin(a); setPaceMax(b); }}>⚡ {l}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid g4 section">
        <div className="glass stat"><div className="label">Matching runs</div><div className="value">{s.count}</div></div>
        <div className="glass stat"><div className="label">Distance</div><div className="value">{km1(s.distance)}<small>km</small></div></div>
        <div className="glass stat"><div className="label">Avg pace</div><div className="value">{fmtPace(s.pace)}<small>/km</small></div></div>
        <div className="glass stat"><div className="label">Avg distance</div><div className="value">{s.count ? km1(s.distance / s.count) : "–"}<small>km</small></div></div>
      </div>

      <div className="section">
        {list.length === 0 && <div className="glass empty">No runs match these filters.</div>}
        {view === "cards" ? (
          <div className="grid g2">
            <AnimatePresence mode="popLayout">
              {list.map((r, i) => (
                <ActivityCard key={r.id} run={r} athlete={data.settings.athlete} index={i}
                  onEdit={() => openRunForm(r)}
                  onDelete={() => (confirm === r.id ? (deleteRun(r.id), setConfirm(null)) : setConfirm(r.id))} />
              ))}
            </AnimatePresence>
          </div>
        ) : list.length > 0 && (
          <div className="glass card tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th onClick={() => sortBy("date")}>Date{arrow("date")}</th>
                <th>Day</th><th>Time</th><th>Type</th>
                <th onClick={() => sortBy("distance")}>Distance{arrow("distance")}</th>
                <th onClick={() => sortBy("duration")}>Duration{arrow("duration")}</th>
                <th onClick={() => sortBy("pace")}>Pace{arrow("pace")}</th>
                <th>Notes</th><th></th>
              </tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.date, { year: true })}</td>
                    <td>{DAYS[dayIndex(r.date)]}</td>
                    <td className="muted">{fmtTime12(r.time)}</td>
                    <td><TypeTag type={r.type} /></td>
                    <td className="num">{km(r.distance)} km</td>
                    <td>{fmtDuration(r.duration)}</td>
                    <td className="num" style={{ color: "#ffb48f" }}>{fmtPace(paceOf(r))}</td>
                    <td className="muted" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn icon ghost" onClick={() => openRunForm(r)} aria-label="Edit"><Pencil size={15} /></button>
                      <button className="btn icon ghost danger" onClick={() => (confirm === r.id ? (deleteRun(r.id), setConfirm(null)) : setConfirm(r.id))} aria-label="Delete"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {confirm && <div className="toast" style={{ zIndex: 60 }}>Tap delete again to confirm · <button className="btn sm ghost" onClick={() => setConfirm(null)}>Cancel</button></div>}
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>Runs tagged “est. date” were imported from the chat log; their dates are reconstructed. Edit any run to correct it.</p>
      </div>
    </div>
  );
}
