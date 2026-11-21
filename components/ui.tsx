"use client";
import { AnimatePresence, motion, animate, useMotionValue, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import type { Run } from "@/lib/types";
import { fmtDate, fmtDuration, fmtPace, fmtTime12, km, paceOf, runTitle, typeMeta } from "@/lib/utils";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            className="sheet"
            style={wide ? { maxWidth: 720 } : undefined}
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="grabber" />
            <div className="sheet-h">
              <h2>{title}</h2>
              <button className="btn icon ghost" onClick={onClose} aria-label="Close"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CountUp({ value, format = (n) => String(Math.round(n)) }: { value: number; format?: (n: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const c = animate(mv, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv, reduce]);
  return <motion.span>{text}</motion.span>;
}

export function Stat({ label, value, unit, foot, icon, delay = 0 }: { label: string; value: ReactNode; unit?: string; foot?: ReactNode; icon?: ReactNode; delay?: number }) {
  return (
    <motion.div className="glass stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -3 }}>
      {icon && <div className="ico">{icon}</div>}
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="foot">{foot}</div>}
    </motion.div>
  );
}

export function Ring({ pct, size = 132, stroke = 12, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FC4C02" />
            <stop offset="1" stopColor="#FFB07A" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ring-g)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - p) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/** Animated SVG runner — legs and arms swing with SMIL so it works everywhere */
export function Runner({ size = 150, speed = 0.7 }: { size?: number; speed?: number }) {
  const d = `${speed}s`;
  const half = `-${speed / 2}s`;
  const limb = { stroke: "#fff", strokeWidth: 6, strokeLinecap: "round" as const };
  const Leg = ({ begin }: { begin: string }) => (
    <g transform="translate(-4,52)">
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-45;35;-45" dur={d} begin={begin} repeatCount="indefinite" />
        <line x1="0" y1="0" x2="0" y2="20" {...limb} />
        <g transform="translate(0,20)">
          <g>
            <animateTransform attributeName="transform" type="rotate" values="15;85;30;15" keyTimes="0;0.45;0.75;1" dur={d} begin={begin} repeatCount="indefinite" />
            <line x1="0" y1="0" x2="0" y2="19" {...limb} />
            <line x1="0" y1="19" x2="6" y2="19" {...limb} strokeWidth={5} />
          </g>
        </g>
      </g>
    </g>
  );
  const Arm = ({ begin, op = 1 }: { begin: string; op?: number }) => (
    <g transform="translate(1,29)" opacity={op}>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="45;-45;45" dur={d} begin={begin} repeatCount="indefinite" />
        <line x1="0" y1="0" x2="0" y2="14" {...limb} strokeWidth={5} />
        <g transform="translate(0,14) rotate(-85)">
          <line x1="0" y1="0" x2="0" y2="12" {...limb} strokeWidth={5} />
        </g>
      </g>
    </g>
  );
  return (
    <svg width={size} height={size * 0.86} viewBox="0 0 140 120" aria-hidden>
      {/* speed lines */}
      {[30, 52, 74].map((y, i) => (
        <line key={y} x1="10" y1={y} x2="34" y2={y} stroke="#FC4C02" strokeWidth="3" strokeLinecap="round" opacity=".7">
          <animate attributeName="x1" values="40;0" dur="0.9s" begin={`${-i * 0.3}s`} repeatCount="indefinite" />
          <animate attributeName="x2" values="60;20" dur="0.9s" begin={`${-i * 0.3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;.8;0" dur="0.9s" begin={`${-i * 0.3}s`} repeatCount="indefinite" />
        </line>
      ))}
      {/* ground */}
      <line x1="0" y1="113" x2="140" y2="113" stroke="rgba(255,255,255,.25)" strokeWidth="2" strokeDasharray="10 8">
        <animate attributeName="stroke-dashoffset" values="0;18" dur={`${speed / 1.4}s`} repeatCount="indefinite" />
      </line>
      <g transform="translate(78,8)">
        <animateTransform attributeName="transform" type="translate" values="78,8;78,4;78,8;78,4;78,8" dur={`${speed}s`} repeatCount="indefinite" />
        <Arm begin={half} op={0.55} />
        <Leg begin={half} />
        <line x1="2" y1="26" x2="-4" y2="52" stroke="#FC4C02" strokeWidth="9" strokeLinecap="round" />
        <circle cx="7" cy="13" r="8.5" fill="#fff" />
        <Leg begin="0s" />
        <Arm begin="0s" />
      </g>
    </svg>
  );
}

export function TypeTag({ type }: { type: string }) {
  const t = typeMeta(type);
  return <span className="tag"><span className="d" style={{ background: t.color }} />{t.label}</span>;
}

export function ActivityCard({ run, athlete, onEdit, onDelete, index = 0 }: { run: Run; athlete: string; onEdit?: () => void; onDelete?: () => void; index?: number }) {
  return (
    <motion.article
      layout
      className="glass act"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ delay: Math.min(index, 10) * 0.035, duration: 0.4 }}
    >
      <div className="act-head">
        <div className="avatar">{athlete.charAt(0)}</div>
        <div>
          <div className="who">{athlete}</div>
          <div className="when">{fmtDate(run.date, { weekday: true, year: true })} at {fmtTime12(run.time)}</div>
        </div>
        <div className="act-actions">
          {onEdit && <button className="btn icon ghost" onClick={onEdit} aria-label="Edit run"><Pencil size={16} /></button>}
          {onDelete && <button className="btn icon ghost danger" onClick={onDelete} aria-label="Delete run"><Trash2 size={16} /></button>}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <h4>{runTitle(run)}</h4>
        <TypeTag type={run.type} />
        {run.tags?.filter((t) => t !== "est. date").map((t) => <span key={t} className="tag">{t}</span>)}
      </div>
      {run.notes && <div className="act-notes">{run.notes}</div>}
      <div className="act-stats">
        <div><div className="l">Distance</div><div className="v">{km(run.distance)} <small className="muted" style={{ fontSize: 13 }}>km</small></div></div>
        <div><div className="l">Pace</div><div className="v">{fmtPace(paceOf(run))} <small className="muted" style={{ fontSize: 13 }}>/km</small></div></div>
        <div><div className="l">Time</div><div className="v">{fmtDuration(run.duration)}</div></div>
      </div>
    </motion.article>
  );
}
