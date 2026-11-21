import type { AppData } from "./types";
import { DAYS, DAYS_LONG, addDays, dayIndex, allWeeks, fmtDate, fmtDuration, fmtHours, fmtPace, fmtTime12, fmtWeekRange, km, paceOf, runTitle, typeMeta, weekDates, weekStat } from "./utils";

function context(data: AppData, key: string) {
  const w = weekStat(data.runs, key);
  const prev = weekStat(data.runs, addDays(key, -7));
  const goals = data.goals.filter((g) => g.date >= key && g.date <= addDays(key, 6)).sort((a, b) => a.date.localeCompare(b.date));
  const weeks = allWeeks(data.runs).filter((x) => x.key <= key).slice(-8);
  return { w, prev, goals, weeks };
}

const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%` : "n/a");

export function weeklyText(data: AppData, key: string): string {
  const { w, prev, goals, weeks } = context(data, key);
  const L: string[] = [];
  const line = "─".repeat(52);
  L.push("VELOX · WEEKLY RUN REPORT");
  L.push(`Athlete: ${data.settings.athlete}`);
  L.push(`Week: ${fmtWeekRange(key)} ${key.slice(0, 4)} (Mon–Sun)`);
  L.push(`Generated: ${new Date().toLocaleString()}`);
  L.push(line);
  L.push("SUMMARY");
  L.push(`  Total distance   ${km(w.distance)} km   (prev week ${km(prev.distance)} km, ${delta(w.distance, prev.distance)})`);
  L.push(`  Runs             ${w.runs.length}`);
  L.push(`  Moving time      ${fmtHours(w.duration)}`);
  L.push(`  Avg weekly pace  ${fmtPace(w.pace)} /km   (prev ${fmtPace(prev.pace)} /km)`);
  L.push(`  Longest run      ${km(w.longest)} km`);
  L.push(`  Fastest pace     ${fmtPace(w.fastest)} /km`);
  L.push(`  Weekly km goal   ${data.settings.weeklyKmGoal} km — ${Math.min(100, Math.round((w.distance / data.settings.weeklyKmGoal) * 100))}% reached`);
  L.push(line);
  L.push("DAY BY DAY");
  weekDates(key).forEach((d, i) => {
    const rs = w.runs.filter((r) => r.date === d);
    if (!rs.length) L.push(`  ${DAYS[i]} ${fmtDate(d).padEnd(7)}  Rest`);
    rs.forEach((r) =>
      L.push(`  ${DAYS[i]} ${fmtDate(d).padEnd(7)}  ${km(r.distance).padStart(5)} km  ${fmtDuration(r.duration).padStart(7)}  ${fmtPace(paceOf(r))}/km  ${typeMeta(r.type).label.padEnd(8)} ${fmtTime12(r.time)}${r.notes ? "  · " + r.notes : ""}`)
    );
  });
  L.push(line);
  L.push("GOALS");
  if (!goals.length) L.push("  No goals set for this week.");
  goals.forEach((g) => L.push(`  [${g.done ? "x" : " "}] ${DAYS[dayIndex(g.date)]} ${fmtDate(g.date)}  ${g.title}${g.targetKm ? ` (${g.targetKm} km)` : ""}`));
  if (goals.length) L.push(`  Completed ${goals.filter((g) => g.done).length}/${goals.length}`);
  L.push(line);
  L.push("LAST 8 WEEKS");
  weeks.forEach((x) => {
    const bar = "█".repeat(Math.round(x.distance)).padEnd(32, " ");
    L.push(`  ${fmtWeekRange(x.key).padEnd(16)} ${bar} ${km(x.distance, 1).padStart(5)} km  ${fmtPace(x.pace)}/km`);
  });
  L.push(line);
  L.push("Keep easy days easy. Keep the shin check before every run.");
  return L.join("\n");
}

/* ---------- self-contained HTML report with inline SVG charts ---------- */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function barSvg(values: number[], labels: string[], highlight = -1, unit = "km") {
  const W = 640, H = 220, P = 28, max = Math.max(1, ...values) * 1.15;
  const bw = (W - P * 2) / values.length;
  const bars = values.map((v, i) => {
    const h = (v / max) * (H - P * 2);
    const x = P + i * bw + bw * 0.18, y = H - P - h, w = bw * 0.64;
    const fill = i === highlight || highlight < 0 ? "#FC4C02" : "#FDBA9A";
    return `<rect x="${x}" y="${y}" width="${w}" height="${Math.max(h, 0)}" rx="4" fill="${fill}"/>` +
      (v ? `<text x="${x + w / 2}" y="${y - 6}" text-anchor="middle" font-size="11" fill="#333">${km(v, 1)}</text>` : "") +
      `<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#777">${esc(labels[i])}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${unit} chart"><line x1="${P}" x2="${W - P}" y1="${H - P}" y2="${H - P}" stroke="#ddd"/>${bars}</svg>`;
}
function lineSvg(values: number[], labels: string[]) {
  const W = 640, H = 220, P = 34;
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v > 0);
  if (pts.length < 1) return `<p class="muted">Not enough data.</p>`;
  const lo = Math.min(...pts.map((p) => p.v)) - 15, hi = Math.max(...pts.map((p) => p.v)) + 15;
  const x = (i: number) => P + (values.length === 1 ? (W - 2 * P) / 2 : (i / (values.length - 1)) * (W - 2 * P));
  const y = (v: number) => P + ((v - lo) / (hi - lo)) * (H - 2 * P); // faster (lower) pace sits higher
  const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.v)}`).join(" ");
  const dots = pts.map((p) => `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="4.5" fill="#FC4C02" stroke="#fff" stroke-width="2"/><text x="${x(p.i)}" y="${y(p.v) - 10}" text-anchor="middle" font-size="11" fill="#333">${fmtPace(p.v)}</text>`).join("");
  const xl = labels.map((l, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#777">${esc(l)}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="pace chart"><path d="${d}" fill="none" stroke="#FC4C02" stroke-width="2"/>${dots}${xl}</svg>`;
}

export function weeklyHtml(data: AppData, key: string): string {
  const { w, prev, goals, weeks } = context(data, key);
  const pct = Math.min(100, Math.round((w.distance / data.settings.weeklyKmGoal) * 100));
  const stat = (l: string, v: string, s = "") => `<div class="stat"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;
  const rows = w.runs.map((r) => `<tr><td>${DAYS_LONG[dayIndex(r.date)]}<br><span class="muted">${fmtDate(r.date)} · ${fmtTime12(r.time)}</span></td><td>${esc(runTitle(r))}</td><td>${km(r.distance)} km</td><td>${fmtDuration(r.duration)}</td><td><b>${fmtPace(paceOf(r))}</b>/km</td><td>${esc(r.notes ?? "")}</td></tr>`).join("");
  const goalRows = goals.map((g) => `<li class="${g.done ? "done" : ""}"><span class="box">${g.done ? "✓" : ""}</span>${fmtDate(g.date, { weekday: true })} — ${esc(g.title)}${g.targetKm ? ` <span class="muted">(${g.targetKm} km)</span>` : ""}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Velox Weekly Report · ${fmtWeekRange(key)}</title>
<style>
*{box-sizing:border-box}body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;color:#1d1d1f;background:#f5f5f7}
.wrap{max-width:860px;margin:0 auto;padding:32px 20px}
header{background:linear-gradient(135deg,#FC4C02,#ff8a3d);color:#fff;border-radius:22px;padding:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
header h1{margin:0;font-size:30px;letter-spacing:-.02em}header p{margin:4px 0 0;opacity:.9}
.brand{font-weight:800;letter-spacing:.2em;font-size:12px;opacity:.9}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0}
.stat{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.05)}
.stat .l{font-size:12px;color:#86868b;text-transform:uppercase;letter-spacing:.06em}.stat .v{font-size:26px;font-weight:700;letter-spacing:-.02em}.stat .s{font-size:12px;color:#86868b}
.card{background:#fff;border-radius:18px;padding:20px;margin:14px 0;box-shadow:0 1px 2px rgba(0,0,0,.05)}
h2{font-size:16px;margin:0 0 12px}.muted{color:#86868b}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px 8px;border-bottom:1px solid #eee;vertical-align:top}th{font-size:12px;color:#86868b;text-transform:uppercase}
.bar{height:10px;background:#eee;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:#FC4C02;border-radius:99px}
ul{list-style:none;padding:0;margin:0}li{padding:8px 0;border-bottom:1px solid #f0f0f0;display:flex;gap:10px;align-items:center}
.box{width:20px;height:20px;border-radius:6px;border:2px solid #ccc;display:inline-grid;place-items:center;font-size:12px;color:#fff;flex:none}
li.done .box{background:#34c759;border-color:#34c759}li.done{color:#86868b}
footer{text-align:center;color:#86868b;font-size:12px;margin-top:24px}
@media print{body{background:#fff}.card,.stat{box-shadow:none;border:1px solid #eee}}
</style></head><body><div class="wrap">
<header><div><div class="brand">VELOX · WEEKLY REPORT</div><h1>${fmtWeekRange(key)} ${key.slice(0, 4)}</h1><p>${esc(data.settings.athlete)} · ${w.runs.length} runs · ${km(w.distance)} km</p></div>
<div style="text-align:right"><div style="font-size:12px;opacity:.9">AVG WEEKLY PACE</div><div style="font-size:34px;font-weight:800">${fmtPace(w.pace)}<span style="font-size:14px">/km</span></div></div></header>
<div class="grid">
${stat("Distance", km(w.distance) + " km", `prev ${km(prev.distance)} km · ${delta(w.distance, prev.distance)}`)}
${stat("Runs", String(w.runs.length), `prev ${prev.runs.length}`)}
${stat("Time", fmtHours(w.duration), `prev ${fmtHours(prev.duration)}`)}
${stat("Avg pace", fmtPace(w.pace) + "/km", `prev ${fmtPace(prev.pace)}/km`)}
${stat("Longest", km(w.longest) + " km", "")}
${stat("Fastest", fmtPace(w.fastest) + "/km", "")}
</div>
<div class="card"><h2>Weekly goal · ${km(w.distance, 1)} / ${data.settings.weeklyKmGoal} km (${pct}%)</h2><div class="bar"><i style="width:${pct}%"></i></div></div>
<div class="card"><h2>Distance by day (km)</h2>${barSvg(w.days, [...DAYS])}</div>
<div class="card"><h2>Pace per run (min/km — higher is faster)</h2>${lineSvg(w.runs.map(paceOf), w.runs.map((r) => DAYS[dayIndex(r.date)]))}</div>
<div class="card"><h2>Last ${weeks.length} weeks (km)</h2>${barSvg(weeks.map((x) => x.distance), weeks.map((x) => fmtDate(x.key)), weeks.length - 1)}</div>
<div class="card"><h2>Average weekly pace trend</h2>${lineSvg(weeks.map((x) => x.pace), weeks.map((x) => fmtDate(x.key)))}</div>
<div class="card"><h2>Runs</h2>${w.runs.length ? `<table><tr><th>Day</th><th>Activity</th><th>Dist</th><th>Time</th><th>Pace</th><th>Notes</th></tr>${rows}</table>` : `<p class="muted">No runs this week.</p>`}</div>
<div class="card"><h2>Goals ${goals.length ? `· ${goals.filter((g) => g.done).length}/${goals.length} done` : ""}</h2>${goals.length ? `<ul>${goalRows}</ul>` : `<p class="muted">No goals this week.</p>`}</div>
<footer>Generated by Velox on ${new Date().toLocaleString()} · Use your browser's Print → Save as PDF for a PDF copy.</footer>
</div></body></html>`;
}

export function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printReport(html: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
  return true;
}
