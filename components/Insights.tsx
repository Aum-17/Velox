"use client";
import { motion } from "framer-motion";
import { Award, Brain, CalendarRange, Flag, Gauge, Zap } from "lucide-react";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { BADGES } from "@/lib/badges";
import { Distribution } from "./charts";
import { DAYS, addDays, dayIndex, dayPart, daysBetween, fmtDate, fmtDuration, fmtPace, km, paceOf, predict, todayISO, weekStart } from "@/lib/utils";

export function Insights() {
  const { data } = useStore();
  const { runs, settings, goals } = data;
  const today = todayISO();

  const x = useMemo(() => {
    const longest = [...runs].sort((a, b) => b.distance - a.distance)[0];
    const fastestAny = [...runs].sort((a, b) => paceOf(a) - paceOf(b))[0];
    const five = runs.filter((r) => r.distance >= 4.99).sort((a, b) => paceOf(a) - paceOf(b))[0];
    const longestTime = [...runs].sort((a, b) => b.duration - a.duration)[0];
    // prediction base: best Riegel-equivalent 10K from runs >= 4 km in last 42 days
    const recent = runs.filter((r) => r.distance >= 4 && daysBetween(r.date, today) <= 42);
    const base = (recent.length ? recent : runs).reduce<{ r: (typeof runs)[0] | null; t: number }>((b, r) => {
      const t = predict(r.duration, r.distance, 10);
      return t < b.t ? { r, t } : b;
    }, { r: null, t: Infinity });
    const dow = DAYS.map((d, i) => {
      const rs = runs.filter((r) => dayIndex(r.date) === i);
      return { label: d, value: rs.length, sub: `${km(rs.reduce((a, r) => a + r.distance, 0), 1)} km` };
    });
    const parts = (["morning", "afternoon", "evening", "night"] as const).map((p) => {
      const rs = runs.filter((r) => dayPart(r.time) === p);
      const d = rs.reduce((a, r) => a + r.distance, 0);
      return { label: p[0].toUpperCase() + p.slice(1), value: rs.length, sub: rs.length ? `avg ${fmtPace(rs.reduce((a, r) => a + r.duration, 0) / d)}/km` : "" };
    });
    const e = settings.easyPace;
    const zones = [
      { label: "Easy", sub: `${fmtPace(e)}+`, n: runs.filter((r) => paceOf(r) >= e).length, color: "#34d399" },
      { label: "Steady", sub: `${fmtPace(e - 45)}–${fmtPace(e)}`, n: runs.filter((r) => paceOf(r) < e && paceOf(r) >= e - 45).length, color: "#fbbf24" },
      { label: "Hard", sub: `< ${fmtPace(e - 45)}`, n: runs.filter((r) => paceOf(r) < e - 45).length, color: "#FC4C02" },
    ];
    // last 4 weeks zone split for the 80/20 nudge
    const last4 = runs.filter((r) => r.date >= addDays(weekStart(today), -21));
    const easyShare = last4.length ? last4.filter((r) => paceOf(r) >= e).length / last4.length : 0;
    return { longest, fastestAny, five, longestTime, base, dow, parts, zones, easyShare, last4 };
  }, [runs, settings.easyPace, today]);

  // heatmap: last 20 weeks
  const heatStart = addDays(weekStart(today), -7 * 19);
  const heat = Array.from({ length: 140 }, (_, i) => addDays(heatStart, i));
  const byDate: Record<string, number> = {};
  runs.forEach((r) => (byDate[r.date] = (byDate[r.date] ?? 0) + r.distance));
  const shade = (v?: number) => (!v ? undefined : v < 4 ? "rgba(252,76,2,.35)" : v < 5.5 ? "rgba(252,76,2,.6)" : v < 7 ? "rgba(252,76,2,.82)" : "#FC4C02");

  const pred = (d: number) => (x.base.r ? predict(x.base.r.duration, x.base.r.distance, d) : 0);
  const targetPace = settings.raceTarget / settings.raceDistance;
  const splits = Array.from({ length: Math.ceil(settings.raceDistance) }, (_, i) => Math.min(i + 1, settings.raceDistance));
  const unlockedIds = new Set(BADGES.filter((b) => b.test(runs, goals)).map((b) => b.id));
  const total = runs.length || 1;

  const PB = ({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) => (
    <motion.div className="glass stat" whileHover={{ y: -3 }}>
      <div className="ico">{icon}</div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="foot">{sub}</div>
    </motion.div>
  );

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Insights</h1>
          <p>Personal bests, race predictions, training balance and badges.</p>
        </div>
      </div>

      <div className="grid g4">
        {x.longest && <PB label="Longest run" icon={<Award size={16} />} value={`${km(x.longest.distance)} km`} sub={fmtDate(x.longest.date, { year: true })} />}
        {x.five && <PB label="Fastest 5K+ pace" icon={<Zap size={16} />} value={`${fmtPace(paceOf(x.five))}/km`} sub={`${km(x.five.distance)} km · ${fmtDate(x.five.date)}`} />}
        {x.fastestAny && <PB label="Fastest pace (any)" icon={<Gauge size={16} />} value={`${fmtPace(paceOf(x.fastestAny))}/km`} sub={`${km(x.fastestAny.distance)} km · ${fmtDate(x.fastestAny.date)}`} />}
        {x.longestTime && <PB label="Longest time on feet" icon={<CalendarRange size={16} />} value={fmtDuration(x.longestTime.duration)} sub={fmtDate(x.longestTime.date, { year: true })} />}
      </div>

      <div className="grid g3 section">
        <div className="glass card">
          <div className="card-h"><h3><Brain size={17} /> Race predictor</h3></div>
          {x.base.r ? (
            <>
              <div className="grid" style={{ gap: 10 }}>
                {[["1.6 km", 1.6], ["5K", 5], ["10K", 10], ["Half marathon", 21.0975]].map(([l, d]) => (
                  <div key={l as string} className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--stroke)" }}>
                    <span>{l}</span>
                    <span><b style={{ fontFamily: "var(--display)", fontSize: 22 }}>{fmtDuration(pred(d as number))}</b> <span className="muted" style={{ fontSize: 12 }}>{fmtPace(pred(d as number) / (d as number))}/km</span></span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Based on your strongest run in the last 6 weeks ({km(x.base.r.distance)} km at {fmtPace(paceOf(x.base.r))}/km, {fmtDate(x.base.r.date)}), using the Riegel formula. Longer predictions assume you&apos;ve trained for the distance.</p>
            </>
          ) : <div className="empty">Log a 4 km+ run to get predictions.</div>}
        </div>

        <div className="glass card">
          <div className="card-h"><h3><Flag size={17} /> {settings.raceName} plan</h3><span className="sub">{fmtDate(settings.raceDate, { weekday: true })}</span></div>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <div><div className="eyebrow">Target</div><div style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 800 }}>{fmtDuration(settings.raceTarget)}</div></div>
            <div style={{ textAlign: "right" }}><div className="eyebrow">Pace</div><div style={{ fontFamily: "var(--display)", fontSize: 30, fontWeight: 800, color: "#ffb48f" }}>{fmtPace(targetPace)}</div></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {splits.map((d) => (
              <div key={d} style={{ textAlign: "center", padding: "8px 2px", borderRadius: 10, background: "rgba(255,255,255,.05)" }}>
                <div className="muted" style={{ fontSize: 11 }}>{d} km</div>
                <div style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{fmtDuration(targetPace * d)}</div>
              </div>
            ))}
          </div>
          {x.base.r && (
            <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 0 }}>
              Current prediction: <b style={{ color: "var(--text)" }}>{fmtDuration(pred(settings.raceDistance))}</b> — {pred(settings.raceDistance) <= settings.raceTarget ? <span className="up">on track for target ✓</span> : <span>{fmtDuration(pred(settings.raceDistance) - settings.raceTarget)} to find</span>}
            </p>
          )}
        </div>

        <div className="glass card">
          <div className="card-h"><h3>Training balance</h3><span className="sub">all runs</span></div>
          <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", gap: 2 }}>
            {x.zones.map((z) => <motion.div key={z.label} initial={{ width: 0 }} animate={{ width: `${(z.n / total) * 100}%` }} transition={{ duration: 1 }} style={{ background: z.color }} />)}
          </div>
          <div className="grid" style={{ gap: 8, marginTop: 14 }}>
            {x.zones.map((z) => (
              <div key={z.label} className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
                <span className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: z.color, display: "inline-block" }} />{z.label} <span className="muted">{z.sub}</span></span>
                <b>{z.n} · {Math.round((z.n / total) * 100)}%</b>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, background: x.easyShare >= 0.6 ? "rgba(48,209,88,.1)" : "rgba(252,76,2,.12)", fontSize: 13, lineHeight: 1.5 }}>
            Last 4 weeks: <b>{Math.round(x.easyShare * 100)}%</b> of runs at easy pace.{" "}
            {x.easyShare >= 0.6 ? "Good balance — easy days are doing their job." : "Most runs are faster than easy pace. Keeping ~80% easy protects your shins and makes quality days count."}
          </div>
        </div>
      </div>

      <div className="glass card section">
        <div className="card-h"><h3>Consistency</h3><span className="sub">last 20 weeks · each square is a day</span></div>
        <div className="row" style={{ alignItems: "flex-start", gap: 8, flexWrap: "nowrap" }}>
          <div style={{ display: "grid", gridTemplateRows: "repeat(7, 15px)", gap: 4, fontSize: 10, color: "var(--text-3)" }}>
            {DAYS.map((d, i) => <span key={d} style={{ lineHeight: "15px" }}>{i % 2 === 0 ? d : ""}</span>)}
          </div>
          <div className="heat">
            {heat.map((d) => (
              <motion.i key={d} title={`${fmtDate(d, { weekday: true })}${byDate[d] ? ` · ${km(byDate[d], 1)} km` : ""}`}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: (daysBetween(heatStart, d) / 140) * 0.6 }}
                style={{ background: d > today ? "transparent" : shade(byDate[d]), outline: d === today ? "1.5px solid #fff" : undefined }} />
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 6, fontSize: 11, color: "var(--text-3)", marginTop: 10 }}>
          Less {[undefined, 3, 5, 6, 8].map((v, i) => <i key={i} style={{ width: 12, height: 12, borderRadius: 3, display: "inline-block", background: shade(v) ?? "rgba(255,255,255,.06)" }} />)} More
        </div>
      </div>

      <div className="grid g2 section">
        <div className="glass card">
          <div className="card-h"><h3>Runs by day of week</h3></div>
          <Distribution data={x.dow} />
        </div>
        <div className="glass card">
          <div className="card-h"><h3>Runs by time of day</h3></div>
          <Distribution data={x.parts} />
        </div>
      </div>

      <div className="glass card section">
        <div className="card-h"><h3><Award size={17} /> Badges</h3><span className="sub">{unlockedIds.size}/{BADGES.length} unlocked</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {BADGES.map((b, i) => (
            <motion.div key={b.id} className={`badge ${unlockedIds.has(b.id) ? "" : "locked"}`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.02 }} whileHover={{ y: -4 }}>
              <div className="e">{b.emoji}</div>
              <div className="t">{b.title}</div>
              <div className="d">{b.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
