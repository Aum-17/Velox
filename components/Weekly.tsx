"use client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, FileText, Printer, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { DailyKmChart, PaceChart, WeeklyKmChart } from "./charts";
import { CountUp, Ring, Stat, TypeTag } from "./ui";
import { DAYS, addDays, allWeeks, dayIndex, fmtDate, fmtDuration, fmtHours, fmtPace, fmtTime12, fmtWeekRange, km, km1, paceOf, todayISO, weekDates, weekStart, weekStat } from "@/lib/utils";
import { download, printReport, weeklyHtml, weeklyText } from "@/lib/report";

export function Weekly() {
  const { data, toggleGoal, showToast } = useStore();
  const today = todayISO();
  const [key, setKey] = useState(weekStart(today));
  const w = useMemo(() => weekStat(data.runs, key), [data.runs, key]);
  const prev = useMemo(() => weekStat(data.runs, addDays(key, -7)), [data.runs, key]);
  const weeks = useMemo(() => allWeeks(data.runs, today), [data.runs, today]);
  const goals = data.goals.filter((g) => g.date >= key && g.date <= addDays(key, 6)).sort((a, b) => a.date.localeCompare(b.date));
  const isCurrent = key === weekStart(today);
  const goal = data.settings.weeklyKmGoal;
  const d = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const dd = d(w.distance, prev.distance);

  const fname = `velox-week-${key}`;
  const dlText = () => { download(`${fname}.txt`, weeklyText(data, key), "text/plain"); showToast("Text report downloaded"); };
  const dlHtml = () => { download(`${fname}.html`, weeklyHtml(data, key), "text/html"); showToast("Visual report downloaded"); };
  const doPrint = () => { if (!printReport(weeklyHtml(data, key))) showToast("Allow pop-ups to print"); };

  const daily = weekDates(key).map((x, i) => ({ label: DAYS[i], distance: Math.round(w.days[i] * 100) / 100, today: x === today }));
  const paceRuns = w.runs.map((r) => ({ label: `${DAYS[dayIndex(r.date)]} ${fmtDate(r.date)}`, pace: paceOf(r), distance: r.distance }));
  const bars = weeks.slice(-12).map((x) => ({ label: fmtDate(x.key), distance: Math.round(x.distance * 100) / 100, pace: x.pace, runs: x.runs.length, current: x.key === key }));

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Weekly</h1>
          <p>Week-by-week breakdown, progress and downloadable reports.</p>
        </div>
        <div className="row">
          <button className="btn" onClick={dlText}><FileText size={16} /> Text report</button>
          <button className="btn primary" onClick={dlHtml}><Download size={16} /> Visual report</button>
          <button className="btn icon" onClick={doPrint} aria-label="Print or save as PDF" title="Print / Save as PDF"><Printer size={17} /></button>
        </div>
      </div>

      <div className="glass card row" style={{ justifyContent: "space-between" }}>
        <button className="btn icon" onClick={() => setKey(addDays(key, -7))} aria-label="Previous week"><ChevronLeft size={18} /></button>
        <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center" }}>
          <div className="eyebrow">{isCurrent ? "This week" : key < weekStart(today) ? "Past week" : "Upcoming"}</div>
          <div style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 800 }}>{fmtWeekRange(key)} {key.slice(0, 4)}</div>
        </motion.div>
        <div className="row" style={{ gap: 6 }}>
          {!isCurrent && <button className="btn sm ghost" onClick={() => setKey(weekStart(today))}>Today</button>}
          <button className="btn icon" onClick={() => setKey(addDays(key, 7))} aria-label="Next week"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="grid g3 section">
        <div className="glass card" style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Ring pct={w.distance / goal} size={130}>
            <div><b>{Math.round((w.distance / goal) * 100)}%</b><span>of {goal} km</span></div>
          </Ring>
          <div>
            <div className="eyebrow">Total weekly</div>
            <div style={{ fontFamily: "var(--display)", fontSize: 44, fontWeight: 800, lineHeight: 1 }}><CountUp value={w.distance} format={(n) => n.toFixed(1)} /><small style={{ fontSize: 15, color: "var(--text-3)" }}> km</small></div>
            <div className={dd >= 0 ? "up" : "down"} style={{ fontSize: 13, marginTop: 6 }}>{prev.distance ? `${dd >= 0 ? "▲" : "▼"} ${Math.abs(dd).toFixed(0)}% vs previous week` : "no previous week"}</div>
          </div>
        </div>
        <div className="grid g2 span2" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <Stat label="Avg weekly pace" value={fmtPace(w.pace)} unit="/km" foot={prev.pace ? `prev ${fmtPace(prev.pace)}/km` : "—"} />
          <Stat label="Runs" value={w.runs.length} foot={`prev ${prev.runs.length}`} delay={0.05} />
          <Stat label="Moving time" value={fmtHours(w.duration)} foot={`prev ${fmtHours(prev.duration)}`} delay={0.1} />
          <Stat label="Longest · fastest" value={`${km(w.longest)}`} unit="km" foot={`fastest ${fmtPace(w.fastest)}/km`} delay={0.15} />
        </div>
      </div>

      <div className="grid g2 section">
        <div className="glass card">
          <div className="card-h"><h3>Distance by day</h3><span className="sub">km</span></div>
          <DailyKmChart data={daily} />
        </div>
        <div className="glass card">
          <div className="card-h"><h3>Pace per run</h3><span className="sub">higher = faster</span></div>
          {paceRuns.length ? <PaceChart data={paceRuns} showAvg={false} height={220} /> : <div className="empty">No runs this week yet.</div>}
        </div>
      </div>

      <div className="grid g3 section">
        <div className="glass card span2">
          <div className="card-h"><h3>Runs this week</h3><span className="sub">{w.runs.length} activities</span></div>
          {w.runs.length === 0 && <div className="empty">Nothing logged for this week.</div>}
          <div className="grid" style={{ gap: 8 }}>
            {w.runs.map((r, i) => (
              <motion.div key={r.id} className="goal" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="avatar" style={{ width: 44, height: 44, borderRadius: 14, fontSize: 12, flexDirection: "column", lineHeight: 1.1 }}>
                  <span>{DAYS[dayIndex(r.date)]}</span><span style={{ fontSize: 15 }}>{Number(r.date.slice(8))}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="gt">{km(r.distance)} km · {fmtPace(paceOf(r))}/km</div>
                  <div className="gs">{fmtDuration(r.duration)} · {fmtTime12(r.time)}{r.notes ? ` · ${r.notes}` : ""}</div>
                </div>
                <TypeTag type={r.type} />
              </motion.div>
            ))}
          </div>
        </div>
        <div className="glass card">
          <div className="card-h"><h3>Goals</h3><span className="sub">{goals.filter((g) => g.done).length}/{goals.length} done</span></div>
          {goals.length === 0 && <div className="empty">No goals this week.</div>}
          <div className="grid" style={{ gap: 8 }}>
            {goals.map((g) => (
              <div key={g.id} className={`goal ${g.done ? "done" : ""}`} style={{ padding: 10 }}>
                <motion.button whileTap={{ scale: 0.8 }} className={`check ${g.done ? "on" : ""}`} onClick={() => toggleGoal(g.id)} aria-label="Toggle goal">{g.done && <Check size={16} />}</motion.button>
                <div><div className="gt" style={{ fontSize: 13.5 }}>{g.title}</div><div className="gs">{fmtDate(g.date, { weekday: true })}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass card section">
        <div className="card-h"><h3>Weekly progress</h3><span className="sub">last 12 weeks · tap a row to open</span></div>
        <WeeklyKmChart data={bars} goal={goal} height={220} />
        <div className="tbl-wrap" style={{ marginTop: 10 }}>
          <table className="tbl">
            <thead><tr><th>Week</th><th>Runs</th><th>Total</th><th>Avg pace</th><th>Longest</th><th>Time</th><th>Change</th></tr></thead>
            <tbody>
              {[...weeks].reverse().map((x, i, arr) => {
                const p = arr[i + 1];
                const ch = p?.distance ? ((x.distance - p.distance) / p.distance) * 100 : null;
                return (
                  <tr key={x.key} onClick={() => setKey(x.key)} style={{ cursor: "pointer", background: x.key === key ? "rgba(252,76,2,.08)" : undefined }}>
                    <td>{fmtWeekRange(x.key)}</td>
                    <td>{x.runs.length}</td>
                    <td className="num">{km1(x.distance)} km</td>
                    <td className="num" style={{ color: "#ffb48f" }}>{fmtPace(x.pace)}</td>
                    <td>{km(x.longest)} km</td>
                    <td>{fmtHours(x.duration)}</td>
                    <td className={ch === null ? "muted" : ch >= 0 ? "up" : "down"}>{ch === null ? "—" : `${ch >= 0 ? "+" : ""}${ch.toFixed(0)}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
