"use client";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Run } from "@/lib/types";
import { fmtPace, km1, summarize, todayISO, weekStart } from "@/lib/utils";
import { Logo } from "./Logo";
import { Ring, Runner } from "./ui";

const KEY = "velox:intro-seen";
const RUN_MS = 2300; // runner crosses, counters tick, ring fills
const HOLD_MS = 900; // "goal" line stays readable before the reveal

/**
 * Opening sequence, once per browser session: a runner crosses the track while this week's pace and distance
 * count in and the weekly-goal ring fills, then it lifts away to reveal the dashboard. Click or Esc skips it.
 */
export function Intro({ runs, weeklyGoal }: { runs: Run[]; weeklyGoal: number }) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"run" | "done">("run");

  const stats = useMemo(() => {
    const ws = weekStart(todayISO());
    const week = summarize(runs.filter((r) => weekStart(r.date) === ws));
    const all = summarize(runs);
    // Prefer this week's pace; fall back to the all-time average so a quiet week still shows something real.
    const pace = week.pace || all.pace;
    return { km: week.distance, pace, pct: weeklyGoal > 0 ? week.distance / weeklyGoal : 0, hasRuns: runs.length > 0 };
  }, [runs, weeklyGoal]);

  useEffect(() => {
    if (reduce) return;
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch {}
    if (seen) return;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    setShow(true);
  }, [reduce]);

  // Timers hang off `show` alone, so a re-run of the effect above can never leave the overlay stuck open.
  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setPhase("done"), RUN_MS);
    const t2 = setTimeout(() => setShow(false), RUN_MS + HOLD_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") setShow(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  // Pace counts down from a slow jog to the real number, so the run "speeds up" into your pace.
  const paceMv = useMotionValue(stats.pace ? Math.max(stats.pace + 150, 480) : 0);
  const paceText = useTransform(paceMv, (v) => (stats.pace ? fmtPace(v) : "–:––"));
  const kmMv = useMotionValue(0);
  const kmText = useTransform(kmMv, (v) => km1(v));
  useEffect(() => {
    if (!show) return;
    const ease = [0.22, 1, 0.36, 1] as const;
    const a = stats.pace ? animate(paceMv, stats.pace, { duration: RUN_MS / 1000, ease }) : null;
    const b = animate(kmMv, stats.km, { duration: RUN_MS / 1000, ease });
    return () => { a?.stop(); b.stop(); };
  }, [show, stats.pace, stats.km, paceMv, kmMv]);

  const achieved = stats.pct >= 1;
  const verdict = !stats.hasRuns
    ? "Your first run starts here"
    : achieved
      ? "Weekly goal achieved"
      : `${Math.round(stats.pct * 100)}% of this week's goal`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro"
          role="presentation"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="intro-glow" aria-hidden />
          <motion.div className="intro-brand" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.5 }}>
            <Logo size={30} /><span>VELOX<small>RUN LAB</small></span>
          </motion.div>

          <div className="intro-stage">
            <div className="intro-track" aria-hidden>
              <motion.div className="intro-trail" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: RUN_MS / 1000, ease: [0.45, 0, 0.2, 1] }} />
              <div className="intro-lane">
                <motion.div className="intro-runner" initial={{ left: "-15%" }} animate={{ left: "100%" }} transition={{ duration: RUN_MS / 1000, ease: [0.45, 0, 0.2, 1] }}>
                  <Runner size={120} speed={0.55} />
                </motion.div>
              </div>
              <motion.div className="intro-flag" initial={{ opacity: 0.35 }} animate={{ opacity: phase === "done" ? 1 : 0.35, scale: phase === "done" ? 1.1 : 1 }}>
                <span />
              </motion.div>
            </div>

            <div className="intro-metrics">
              <motion.div className="intro-metric" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <span className="eyebrow">Pace</span>
                <b><motion.span>{paceText}</motion.span><small>/km</small></b>
              </motion.div>
              <motion.div className="intro-ring" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                <Ring pct={Math.min(stats.pct, 1)} size={124} stroke={10}>
                  <div><b><motion.span>{kmText}</motion.span></b><span>of {weeklyGoal} km</span></div>
                </Ring>
              </motion.div>
              <motion.div className="intro-metric" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <span className="eyebrow">This week</span>
                <b><motion.span>{kmText}</motion.span><small>km</small></b>
              </motion.div>
            </div>

            <div className="intro-verdict" aria-live="polite">
              <AnimatePresence mode="wait">
                {phase === "done" ? (
                  <motion.p key="v" className={achieved ? "ok" : ""} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {achieved && <span className="intro-check" aria-hidden>✓</span>}{verdict}
                  </motion.p>
                ) : (
                  <motion.p key="l" className="muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>Warming up your week…</motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button className="intro-skip" onClick={() => setShow(false)}>Skip</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
