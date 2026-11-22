"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtPace, km } from "@/lib/utils";
import { useReducedMotion } from "framer-motion";

const AX = { stroke: "rgba(255,255,255,0.35)", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />;
const ORANGE = "#FC4C02";
const ORANGE_SOFT = "rgba(252,76,2,0.38)";

type TTProps = { active?: boolean; payload?: { payload: Record<string, unknown> }[]; render: (p: Record<string, unknown>) => React.ReactNode };
function TT({ active, payload, render }: TTProps) {
  if (!active || !payload?.length) return null;
  return <div className="tt">{render(payload[0].payload)}</div>;
}

export interface WeekBar { label: string; distance: number; pace: number; runs: number; current?: boolean; goal?: number }

export function WeeklyKmChart({ data, goal, height = 240 }: { data: WeekBar[]; goal?: number; height?: number }) {
  const anim = !useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 6, left: -18, bottom: 0 }} barCategoryGap="22%">
        {GRID}
        <XAxis dataKey="label" {...AX} interval="preserveStartEnd" />
        <YAxis {...AX} width={44} />
        {goal ? <ReferenceLine y={goal} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 4" label={{ value: `goal ${goal}`, fill: "rgba(255,255,255,.5)", fontSize: 11, position: "insideTopRight" }} /> : null}
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<TT render={(p) => (<><div className="k">Week of {String(p.label)}</div><b>{km(Number(p.distance), 1)} km</b> · {String(p.runs)} runs<br /><span className="k">avg {fmtPace(Number(p.pace))}/km</span></>)} />} />
        <Bar dataKey="distance" radius={[6, 6, 2, 2]} animationDuration={900} isAnimationActive={anim}>
          {data.map((d, i) => <Cell key={i} fill={d.current ? ORANGE : ORANGE_SOFT} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyKmChart({ data, height = 220 }: { data: { label: string; distance: number; today?: boolean }[]; height?: number }) {
  const anim = !useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 6, left: -18, bottom: 0 }} barCategoryGap="26%">
        {GRID}
        <XAxis dataKey="label" {...AX} />
        <YAxis {...AX} width={44} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<TT render={(p) => (<><div className="k">{String(p.label)}</div><b>{km(Number(p.distance), 2)} km</b></>)} />} />
        <Bar dataKey="distance" radius={[6, 6, 2, 2]} animationDuration={800} isAnimationActive={anim}>
          {data.map((d, i) => <Cell key={i} fill={d.today ? ORANGE : ORANGE_SOFT} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Pace over time. Y is reversed so faster pace sits higher. */
export function PaceChart({ data, height = 240, showAvg = true, target }: { data: { label: string; pace: number; avg?: number; distance?: number }[]; height?: number; showAvg?: boolean; target?: number }) {
  const anim = !useReducedMotion();
  const vals = data.flatMap((d) => [d.pace, d.avg ?? d.pace]).filter((v) => v > 0);
  if (!vals.length) return <div className="empty" style={{ height, display: "grid", placeItems: "center" }}>Log a run to see your pace trend.</div>;
  const lo = Math.floor((Math.min(...vals, target ?? Infinity) - 15) / 15) * 15;
  const hi = Math.ceil((Math.max(...vals) + 15) / 15) * 15;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ORANGE} stopOpacity={0.35} />
            <stop offset="1" stopColor={ORANGE} stopOpacity={0} />
          </linearGradient>
        </defs>
        {GRID}
        <XAxis dataKey="label" {...AX} interval="preserveStartEnd" minTickGap={18} />
        <YAxis {...AX} width={50} reversed domain={[lo, hi]} tickFormatter={(v) => fmtPace(v)} />
        {target ? <ReferenceLine y={target} stroke="#30d158" strokeDasharray="4 4" label={{ value: `target ${fmtPace(target)}`, fill: "#30d158", fontSize: 11, position: "insideBottomRight" }} /> : null}
        <Tooltip cursor={{ stroke: "rgba(255,255,255,0.3)" }} content={<TT render={(p) => (<><div className="k">{String(p.label)}</div><b>{fmtPace(Number(p.pace))}/km</b>{p.distance ? <> · {km(Number(p.distance))} km</> : null}{p.avg ? <><br /><span className="k">5-run avg {fmtPace(Number(p.avg))}/km</span></> : null}</>)} />} />
        <Area type="linear" dataKey="pace" stroke={ORANGE} strokeWidth={2} fill="url(#paceFill)" baseValue={hi} dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }} animationDuration={1000} isAnimationActive={anim} />
        {showAvg && <Line type="monotone" dataKey="avg" stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={1200} isAnimationActive={anim} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WeeklyPaceChart({ data, height = 220 }: { data: WeekBar[]; height?: number }) {
  const anim = !useReducedMotion();
  const vals = data.map((d) => d.pace).filter((v) => v > 0);
  if (!vals.length) return <div className="empty" style={{ height, display: "grid", placeItems: "center" }}>Weekly pace shows up after your first run.</div>;
  const lo = Math.floor((Math.min(...vals) - 10) / 15) * 15;
  const hi = Math.ceil((Math.max(...vals) + 10) / 15) * 15;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data.filter((d) => d.pace > 0)} margin={{ top: 12, right: 8, left: -10, bottom: 0 }}>
        {GRID}
        <XAxis dataKey="label" {...AX} interval="preserveStartEnd" />
        <YAxis {...AX} width={50} reversed domain={[lo, hi]} tickFormatter={(v) => fmtPace(v)} />
        <Tooltip cursor={{ stroke: "rgba(255,255,255,0.3)" }} content={<TT render={(p) => (<><div className="k">Week of {String(p.label)}</div><b>{fmtPace(Number(p.pace))}/km</b> avg<br /><span className="k">{km(Number(p.distance), 1)} km · {String(p.runs)} runs</span></>)} />} />
        <Line type="monotone" dataKey="pace" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 4, fill: ORANGE, stroke: "#0d0f16", strokeWidth: 2 }} activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2 }} animationDuration={1000} isAnimationActive={anim} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Distribution({ data, height = 200 }: { data: { label: string; value: number; sub?: string }[]; height?: number }) {
  const anim = !useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 18, right: 6, left: -18, bottom: 0 }} barCategoryGap="24%">
        {GRID}
        <XAxis dataKey="label" {...AX} />
        <YAxis {...AX} width={44} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<TT render={(p) => (<><div className="k">{String(p.label)}</div><b>{String(p.value)}</b>{p.sub ? <> · {String(p.sub)}</> : null}</>)} />} />
        <Bar dataKey="value" fill={ORANGE} radius={[6, 6, 2, 2]} animationDuration={800} isAnimationActive={anim} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({ values, height = 46 }: { values: number[]; height?: number }) {
  const anim = !useReducedMotion();
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ORANGE} stopOpacity={0.4} />
            <stop offset="1" stopColor={ORANGE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={ORANGE} strokeWidth={2} fill="url(#spark)" dot={false} isAnimationActive={anim} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
