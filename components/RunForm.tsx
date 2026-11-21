"use client";
import { useEffect, useState } from "react";
import { Modal } from "./ui";
import { useStore } from "@/lib/store";
import type { Run, RunType } from "@/lib/types";
import { RUN_TYPES, addDays, fmtDate, fmtDuration, fmtPace, nowTime, parseDuration, todayISO, DAYS_LONG, dayIndex } from "@/lib/utils";

const FEELS = ["😫", "😕", "🙂", "😄", "🔥"];
const TAGS = ["partner", "fasted", "new shoes", "treadmill", "hills", "rain", "heat", "track"];

export function RunForm() {
  const { runDraft, closeRunForm, addRun, updateRun } = useStore();
  const editing = !!runDraft?.id;
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [dist, setDist] = useState("");
  const [dur, setDur] = useState("");
  const [type, setType] = useState<RunType>("easy");
  const [feel, setFeel] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!runDraft) return;
    setDate(runDraft.date ?? todayISO());
    setTime(runDraft.time ?? nowTime());
    setDist(runDraft.distance ? String(runDraft.distance) : "");
    setDur(runDraft.duration ? fmtDuration(runDraft.duration) : "");
    setType(runDraft.type ?? "easy");
    setFeel(runDraft.feel);
    setNotes(runDraft.notes ?? "");
    setTags(runDraft.tags ?? []);
    setErr("");
  }, [runDraft]);

  const d = parseFloat(dist);
  const s = parseDuration(dur);
  const pace = d > 0 && s ? s / d : 0;

  const submit = () => {
    if (!(d > 0)) return setErr("Enter a distance in km, e.g. 5.2");
    if (!s) return setErr("Enter a time like 32:15 or 1:02:30");
    const run: Omit<Run, "id"> = { date, time, distance: Math.round(d * 100) / 100, duration: s, type, feel, notes: notes.trim() || undefined, tags, gps: runDraft?.gps };
    if (editing) updateRun({ ...(runDraft as Run), ...run });
    else addRun(run);
    closeRunForm();
  };

  return (
    <Modal open={!!runDraft} onClose={closeRunForm} title={editing ? "Edit run" : "Log a run"}>
      <div className="form-grid">
        <div className="full chips">
          {[["Today", todayISO()], ["Yesterday", addDays(todayISO(), -1)], ["2 days ago", addDays(todayISO(), -2)]].map(([l, v]) => (
            <button key={l} className={`chip ${date === v ? "on" : ""}`} onClick={() => setDate(v)}>{l}</button>
          ))}
          <button className="chip" onClick={() => { setDate(todayISO()); setTime(nowTime()); }}>⏱ Now</button>
        </div>
        <div className="field">
          <label>Date · {DAYS_LONG[dayIndex(date)]}</label>
          <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Start time</label>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label>Distance (km)</label>
          <input className="input" inputMode="decimal" placeholder="5.00" value={dist} onChange={(e) => setDist(e.target.value.replace(",", "."))} autoFocus={!editing} />
        </div>
        <div className="field">
          <label>Time (mm:ss or h:mm:ss)</label>
          <input className="input" inputMode="numeric" placeholder="32:15" value={dur} onChange={(e) => setDur(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div className="full preview">
          <div><div className="l">Distance</div><div className="v">{d > 0 ? d.toFixed(2) : "–"}</div></div>
          <div><div className="l">Pace /km</div><div className="v">{fmtPace(pace)}</div></div>
          <div><div className="l">Time</div><div className="v">{s ? fmtDuration(s) : "–"}</div></div>
        </div>
        <div className="field full">
          <label>Run type</label>
          <div className="chips">
            {RUN_TYPES.map((t) => (
              <button key={t.id} className={`chip ${type === t.id ? "on" : ""}`} onClick={() => setType(t.id)}>
                <span style={{ width: 8, height: 8, borderRadius: 9, background: t.color }} />{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label>How did it feel?</label>
          <div className="chips">
            {FEELS.map((f, i) => (
              <button key={f} className={`chip ${feel === i + 1 ? "on" : ""}`} style={{ fontSize: 20, padding: "4px 12px" }} onClick={() => setFeel(feel === i + 1 ? undefined : i + 1)}>{f}</button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label>Tags</label>
          <div className="chips">
            {TAGS.map((t) => (
              <button key={t} className={`chip ${tags.includes(t) ? "on" : ""}`} onClick={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}>{t}</button>
            ))}
          </div>
        </div>
        <div className="field full">
          <label>Notes</label>
          <textarea className="input" rows={2} placeholder="Legs felt fresh, negative split…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <div className="full" style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
        <div className="full row" style={{ justifyContent: "space-between" }}>
          <span className="muted" style={{ fontSize: 12.5 }}>{fmtDate(date, { weekday: true, year: true })}</span>
          <div className="row">
            <button className="btn ghost" onClick={closeRunForm}>Cancel</button>
            <button className="btn primary" onClick={submit}>{editing ? "Save changes" : "Save run"}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
