"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useStore } from "@/lib/store";
import { Check } from "lucide-react";

const LINES: Record<string, string[]> = {
  goal: ["Discipline wins. One more box ticked.", "That's how officers are made.", "Plan → Execute → Done."],
  badge: ["Something new for the trophy shelf.", "You earned this one, Pratham."],
  week: ["Volume banked. Recovery next.", "The engine is getting bigger."],
  pb: ["Faster than ever before.", "New personal best — log it, own it."],
  run: ["Another brick in the base.", "Consistency is your superpower."],
};

export function Celebration() {
  const { celebrations, dismissCelebration, toast } = useStore();
  const c = celebrations[0];

  useEffect(() => {
    if (!c) return;
    const colors = ["#FC4C02", "#FF9A4D", "#ffffff", "#30d158", "#ffd60a"];
    const big = c.kind !== "run";
    confetti({ particleCount: big ? 140 : 60, spread: big ? 100 : 70, origin: { y: 0.6 }, colors, scalar: 1.05, zIndex: 300 });
    if (big) {
      const t1 = setTimeout(() => confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 300 }), 250);
      const t2 = setTimeout(() => confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 300 }), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    const t = setTimeout(dismissCelebration, 2600);
    return () => clearTimeout(t);
  }, [c, dismissCelebration]);

  const line = c ? LINES[c.kind][c.id.charCodeAt(0) % LINES[c.kind].length] : "";

  return (
    <>
      <AnimatePresence mode="wait">
        {c && (
          <motion.div key={c.id} className="celebrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={dismissCelebration}>
            <motion.div
              className="cele-card"
              initial={{ scale: 0.6, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 16, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div className="cele-emoji" initial={{ rotate: -30, scale: 0 }} animate={{ rotate: [0, -10, 10, 0], scale: [0, 1.3, 1] }} transition={{ duration: 0.8, delay: 0.1 }}>
                {c.emoji ?? "🏆"}
              </motion.div>
              <h2>{c.title}</h2>
              {c.subtitle && <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>{c.subtitle}</p>}
              <p>{line}</p>
              <button className="btn primary" style={{ width: "100%" }} onClick={dismissCelebration}>
                {celebrations.length > 1 ? `Next (${celebrations.length - 1} more)` : "Let's go!"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }}>
            <Check size={16} color="#30d158" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
