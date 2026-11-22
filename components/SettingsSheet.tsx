"use client";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./ui";
import { useStore } from "@/lib/store";
import { download } from "@/lib/report";
import { fmtDuration, fmtPace, parseDuration, todayISO } from "@/lib/utils";
import type { AppData } from "@/lib/types";
import { Profile } from "./Profile";

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, updateSettings, importData, resetData, showToast, isOwner } = useStore();
  const s = data.settings;
  const [f, setF] = useState({ athlete: "", weekly: "", easy: "", raceName: "", raceDate: "", raceDist: "", raceTarget: "", ssbLabel: "", ssbDate: "" });
  const [confirmReset, setConfirmReset] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setF({ athlete: s.athlete, weekly: String(s.weeklyKmGoal), easy: fmtPace(s.easyPace), raceName: s.raceName, raceDate: s.raceDate, raceDist: String(s.raceDistance), raceTarget: fmtDuration(s.raceTarget), ssbLabel: s.ssbLabel, ssbDate: s.ssbDate });
    setConfirmReset(false);
  }, [open, s]);

  const save = () => {
    updateSettings({
      athlete: f.athlete.trim() || s.athlete || "Runner",
      weeklyKmGoal: parseFloat(f.weekly) || s.weeklyKmGoal,
      easyPace: parseDuration(f.easy) || s.easyPace,
      raceName: f.raceName.trim() || s.raceName,
      raceDate: f.raceDate || s.raceDate,
      raceDistance: parseFloat(f.raceDist) || s.raceDistance,
      raceTarget: parseDuration(f.raceTarget) || s.raceTarget,
      ssbLabel: f.ssbLabel.trim() || s.ssbLabel,
      ssbDate: f.ssbDate || s.ssbDate,
    });
    showToast("Settings saved");
    onClose();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files?.[0];
    if (!fl) return;
    try {
      const d = JSON.parse(await fl.text()) as AppData;
      if (!Array.isArray(d.runs)) throw new Error();
      importData(d);
      onClose();
    } catch { showToast("That file isn't a Velox backup"); }
    e.target.value = "";
  };

  const F = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field"><label>{label}</label><input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} /></div>
  );

  return (
    <Modal open={open} onClose={onClose} title="Profile & settings">
      <div className="form-grid">
        <Profile />
        <div className="full eyebrow" style={{ borderTop: "1px solid var(--stroke)", paddingTop: 16 }}>Training</div>
        {F("athlete", "Athlete name")}
        {F("weekly", "Weekly km goal", { inputMode: "decimal" })}
        {F("easy", "Easy pace threshold (min/km)")}
        {F("raceName", "Race name")}
        {F("raceDate", "Race date", { type: "date" })}
        {F("raceDist", "Race distance (km)", { inputMode: "decimal" })}
        {F("raceTarget", "Race target time (h:mm:ss)")}
        {F("ssbLabel", "Big goal label")}
        {F("ssbDate", "Big goal date", { type: "date" })}
        <div className="full row" style={{ justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
        <div className="full" style={{ borderTop: "1px solid var(--stroke)", paddingTop: 16 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Your data</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Your runs and goals are saved to your account and sync across every device you sign in on. Only you can see them. Export a backup any time.
          </p>
          <div className="row">
            <button className="btn" onClick={() => { download(`velox-backup-${todayISO()}.json`, JSON.stringify(data, null, 2), "application/json"); showToast("Backup downloaded"); }}><Download size={16} /> Export backup</button>
            <button className="btn" onClick={() => file.current?.click()}><Upload size={16} /> Import backup</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={onFile} />
            <button className="btn ghost danger" onClick={() => (confirmReset ? (resetData(), onClose()) : setConfirmReset(true))}>
              <RotateCcw size={16} /> {confirmReset ? (isOwner ? "Tap again to restore original log" : "Tap again to erase all data") : "Reset"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

