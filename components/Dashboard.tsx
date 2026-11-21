"use client";
import { motion } from "framer-motion";
import { Activity, CalendarDays, Clock, Flame, Gauge, Plus, Route, Timer, TrendingUp, TrendingDown, Play, Mountain, Check } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { ActivityCard, CountUp, Ring, Runner, Stat } from "./ui";
import { PaceChart, WeeklyKmChart, WeeklyPaceChart } from "./charts";
import { DAYS, allWeeks, byDateAsc, byDateDesc, dayIndex, daysBetween, fmtDate, fmtHours, fmtPace, km, km1, paceOf, streak, summarize, toISODate, weekDates, weekStart, addDays } from "@/lib/utils";

export function Dashboard({ go }: { go: (tab: string) => void }) {
  const { data, openRunForm, toggleGoal } = useStore();
  const now = useNow(30000);
  const today = toISODate(now);
  const { runs, settings, goals } = data;

  const m = useMemo(() => {
    const total = summarize(runs);
    const weeks = allWeeks(runs, today);
    const cur = weeks[weeks.length - 1];
    const prev = weeks[weeks.length - 2];
    const sorted = [...runs].sort(byDateAsc);
    const pace = sorted.slice(-30).map((r, i, a) => {
      const win = a.slice(Math.max(0, i - 4), i + 1);
      return { label: fmtDate(r.date), pace: paceOf(r), distance: r.distance, avg: win.reduce((s, x) => s + x.duration, 0) / win.reduce((s, x) => s + x.distance, 0) };
    });
    const weekBars = weeks.slice(-10).map((w) => ({ label: fmtDate(w.key), distance: Math.round(w.distance * 100) / 100, pace: w.pace, runs: w.runs.length, current: w.key === cur.key }));
    return { total, weeks, cur, prev, pace, weekBars };
  }, [runs, today]);

  const hour = now.getHours();
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayGoals = goals.filter((g) => g.date === today);
  const ws = weekStart(today);
  const strip = weekDates(ws);
  const distDelta = m.prev?.distance ? ((m.cur.distance - m.prev.distance) / m.prev.distance) * 100 : 0;
  const paceDelta = m.prev?.pace && m.cur.pace ? m.prev.pace - m.cur.pace : 0;
  const raceIn = daysBetween(today, settings.raceDate);
  const ssbIn = daysBetween(today, settings.ssbDate);
  const recent = [...runs].sort(byDateDesc).slice(0, 4);
  const pct = m.cur.distance / settings.weeklyKmGoal;
  const st = streak(runs, today);

  return (
    <div>
      {/* HERO */}
      <motion.section className="glass hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ marginTop: 18 }}>
        <div>
          <div className="eyebrow">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</div>
          <h1>{greet},<br /><em>{settings.athlete}</em></h1>
          <p>
            {m.cur.runs.length
              ? <>This week: <b style={{ color: "var(--text)" }}>{km1(m.cur.distance)} km</b> over {m.cur.runs.length} run{m.cur.runs.length > 1 ? "s" : ""} at {fmtPace(m.cur.pace)}/km.</>
              : <>New week, clean slate. Time to put the first run on the board.</>}
            {todayGoals.length ? <> Today: <b style={{ color: "var(--text)" }}>{todayGoals.map((g) => g.title).join(", ")}</b>.</> : null}
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn primary" onClick={() => openRunForm()}><Plus size={18} /> Log run</button>
            <button className="btn" onClick={() => go("live")}><Play size={16} /> Start live run</button>
          </div>
          <div className="countdowns">
            {raceIn >= 0 && <div className="cd"><b>{raceIn}</b><span>days to {settings.raceName}</span></div>}
            {ssbIn >= 0 && <div className="cd"><b>{Math.ceil(ssbIn / 7)}</b><span>weeks to {settings.ssbLabel}</span></div>}
            <div className="cd"><b>{st}</b><span>day streak</span></div>
          </div>
        </div>
        <div className="hero-scene row" style={{ justifyContent: "center", gap: 10 }}>
          <Runner size={170} />
          <Ring pct={pct} size={140}>
            <div><b>{km1(m.cur.distance)}</b><span>of {settings.weeklyKmGoal} km</span></div>
          </Ring>
        </div>
      </motion.section>

      {/* STATS */}
      <div className="grid g4 section">
        <Stat label="Total distance" icon={<Route size={16} />} value={<CountUp value={m.total.distance} format={(n) => n.toFixed(1)} />} unit="km" foot={`${m.weeks.length} weeks logged`} delay={0.05} />
        <Stat label="Total runs" icon={<Activity size={16} />} value={<CountUp value={m.total.count} />} foot={`${(m.total.count / Math.max(1, m.weeks.length)).toFixed(1)} runs / week`} delay={0.1} />
        <Stat label="Moving time" icon={<Clock size={16} />} value={fmtHours(m.total.duration)} foot="all time" delay={0.15} />
        <Stat label="Overall avg pace" icon={<Gauge size={16} />} value={fmtPace(m.total.pace)} unit="/km" foot={`best ${fmtPace(m.total.fastest)}/km`} delay={0.2} />
        <Stat label="This week" icon={<CalendarDays size={16} />} value={<CountUp value={m.cur.distance} format={(n) => n.toFixed(1)} />} unit="km"
          foot={m.prev ? <span className={distDelta >= 0 ? "up" : "down"}>{distDelta >= 0 ? "▲" : "▼"} {Math.abs(distDelta).toFixed(0)}% vs last week</span> : "first week"} delay={0.25} />
        <Stat label="Avg weekly pace" icon={<Timer size={16} />} value={fmtPace(m.cur.pace)} unit="/km"
          foot={paceDelta ? <span className={paceDelta > 0 ? "up" : "down"}>{paceDelta > 0 ? "▲ faster" : "▼ slower"} by {fmtPace(Math.abs(paceDelta)).replace(/^0:/, "")}{Math.abs(paceDelta) < 60 ? "s" : ""}</span> : "—"} delay={0.3} />
        <Stat label="Longest run" icon={<Mountain size={16} />} value={km(m.total.longest)} unit="km" foot={`this week ${km(m.cur.longest)} km`} delay={0.35} />
        <Stat label="Runs this week" icon={<Flame size={16} />} value={m.cur.runs.length} foot={`last week ${m.prev?.runs.length ?? 0}`} delay={0.4} />
      </div>

      {/* WEEK STRIP + TODAY */}
      <div className="grid g3 section">
        <div className="glass card span2">
          <div className="card-h">
            <h3><CalendarDays size={17} /> This week</h3>
            <button className="btn sm ghost" onClick={() => go("weekly")}>Weekly report →</button>
          </div>
          <div className="weekstrip">
            {strip.map((d, i) => {
              const rs = runs.filter((r) => r.date === d);
              const dist = rs.reduce((a, r) => a + r.distance, 0);
              const g = goals.find((x) => x.date === d);
              return (
                <motion.div key={d} className={`wd ${d === today ? "today" : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="dn">{DAYS[i]}</div>
                  <div className="dd">{Number(d.slice(8))}</div>
                  {dist ? <div className="bubble run">{km1(dist)}</div>
                    : g && d >= today ? <div className="bubble plan" title={g.title}>{g.kind === "rest" ? "R" : g.targetKm ?? "•"}</div>
                    : <div className="bubble rest">{d < today ? "–" : ""}</div>}
                  {g?.done && <Check size={13} color="#30d158" />}
                </motion.div>
              );
            })}
          </div>
          <div style={{ marginTop: 14 }}>
            <WeeklyKmChart data={m.weekBars} goal={settings.weeklyKmGoal} height={210} />
          </div>
        </div>
        <div className="glass card">
          <div className="card-h">
            <h3>🎯 Today&apos;s goals</h3>
            <button className="btn sm ghost" onClick={() => go("goals")}>All goals →</button>
          </div>
          {todayGoals.length === 0 && <div className="empty">No goal planned for today.<br /><button className="btn sm" style={{ marginTop: 10 }} onClick={() => go("goals")}>Plan one</button></div>}
          <div className="grid" style={{ gap: 8 }}>
            {todayGoals.map((g) => (
              <div key={g.id} className={`goal ${g.done ? "done" : ""}`}>
                <motion.button whileTap={{ scale: 0.8 }} className={`check ${g.done ? "on" : ""}`} onClick={() => toggleGoal(g.id)} aria-label="Toggle goal">{g.done && <Check size={16} />}</motion.button>
                <div>
                  <div className="gt">{g.title}</div>
                  <div className="gs">{g.targetKm ? `${g.targetKm} km` : ""}{g.note ? ` · ${g.note}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Coming up</div>
          <div className="grid" style={{ gap: 6 }}>
            {goals.filter((g) => g.date > today && !g.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map((g) => (
              <div key={g.id} className="row" style={{ justifyContent: "space-between", fontSize: 13.5 }}>
                <span>{g.title}</span><span className="muted">{fmtDate(g.date, { weekday: true })}</span>
              </div>
            ))}
          </div>
          <div className="eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>Week progress</div>
          <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.7 }}>
            Distance <b className={distDelta >= 0 ? "up" : "down"}>{distDelta >= 0 ? "+" : ""}{distDelta.toFixed(0)}%</b> vs last week<br />
            {m.cur.runs.length ? <>Day {dayIndex(today) + 1}/7 · on track for <b style={{ color: "var(--text)" }}>{km1(m.cur.distance / ((dayIndex(today) + 1) / 7))} km</b></> : "No runs yet this week"}
          </div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid g3 section">
        <div className="glass card span2">
          <div className="card-h">
            <h3><TrendingUp size={17} /> Pace trend</h3>
            <div className="legend"><span><i style={{ background: "#FC4C02" }} />Each run</span><span><i style={{ background: "rgba(255,255,255,.75)" }} />5-run average</span></div>
          </div>
          <PaceChart data={m.pace} height={250} target={settings.raceTarget / settings.raceDistance} />
          <div className="sub muted" style={{ fontSize: 12 }}>Higher = faster. Green line = race target pace.</div>
        </div>
        <div className="glass card">
          <div className="card-h"><h3>{paceDelta >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />} Avg weekly pace</h3></div>
          <WeeklyPaceChart data={m.weekBars} height={250} />
        </div>
      </div>

      {/* RECENT */}
      <div className="section">
        <div className="card-h" style={{ padding: "0 4px" }}>
          <h3 style={{ fontSize: 18 }}>Recent activity</h3>
          <button className="btn sm ghost" onClick={() => go("runs")}>View all {runs.length} →</button>
        </div>
        <div className="grid g2">
          {recent.map((r, i) => <ActivityCard key={r.id} run={r} athlete={settings.athlete} index={i} onEdit={() => openRunForm(r)} />)}
        </div>
      </div>
    </div>
  );
}
