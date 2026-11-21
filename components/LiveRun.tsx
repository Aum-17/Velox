"use client";
import { motion } from "framer-motion";
import { MapPin, Pause, Play, Square, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Runner } from "./ui";
import { fmtDuration, fmtPace, toISODate } from "@/lib/utils";

interface LiveState { startedAt: number | null; accumulated: number; resumedAt: number | null; distance: number; gps: boolean }
const KEY = "velox:live:v1";
const blank: LiveState = { startedAt: null, accumulated: 0, resumedAt: null, distance: 0, gps: true };

function haversine(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function LiveRun() {
  const { openRunForm, data } = useStore();
  const [s, setS] = useState<LiveState>(blank);
  const [, tick] = useState(0);
  const [gpsMsg, setGpsMsg] = useState("");
  const last = useRef<GeolocationCoordinates | null>(null);
  const watch = useRef<number | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setS(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);

  const running = s.resumedAt !== null;
  const elapsed = s.accumulated + (running ? (Date.now() - s.resumedAt!) / 1000 : 0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [running]);

  // GPS tracking while running
  useEffect(() => {
    if (!running || !s.gps) return;
    if (!("geolocation" in navigator)) { setGpsMsg("GPS not available on this device"); return; }
    setGpsMsg("Acquiring GPS…");
    last.current = null;
    watch.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = pos.coords;
        if (c.accuracy > 35) { setGpsMsg(`Weak GPS (±${Math.round(c.accuracy)} m)`); return; }
        setGpsMsg(`GPS locked ±${Math.round(c.accuracy)} m`);
        if (last.current) {
          const d = haversine(last.current, c);
          if (d > 0.004 && d < 0.1) setS((p) => ({ ...p, distance: p.distance + d }));
          if (d < 0.004) return; // ignore jitter, keep anchor
        }
        last.current = c;
      },
      (err) => setGpsMsg(err.code === 1 ? "Location permission denied — enter distance at the end" : "GPS error — enter distance at the end"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
  }, [running, s.gps]);

  // keep screen awake while running
  useEffect(() => {
    if (!running) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (wake.current = l)).catch(() => {});
    return () => { wake.current?.release().catch(() => {}); wake.current = null; };
  }, [running]);

  const start = () => setS((p) => ({ ...p, startedAt: p.startedAt ?? Date.now(), resumedAt: Date.now() }));
  const pause = () => setS((p) => ({ ...p, accumulated: p.accumulated + (Date.now() - (p.resumedAt ?? Date.now())) / 1000, resumedAt: null }));
  const reset = () => { setS({ ...blank, gps: s.gps }); setGpsMsg(""); };
  const finish = () => {
    const total = Math.round(elapsed);
    const st = new Date(s.startedAt ?? Date.now());
    openRunForm({
      date: toISODate(st),
      time: `${String(st.getHours()).padStart(2, "0")}:${String(st.getMinutes()).padStart(2, "0")}`,
      duration: total,
      distance: s.distance > 0.05 ? Math.round(s.distance * 100) / 100 : undefined,
      type: "easy",
      gps: s.distance > 0.05,
    });
    setS({ ...blank, gps: s.gps });
  };

  const pace = s.distance > 0.05 ? elapsed / s.distance : 0;
  const easy = data.settings.easyPace;

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Live run</h1>
          <p>Start the clock when you start running. Date and time are captured automatically.</p>
        </div>
      </div>
      <div className="grid g3">
        <motion.div className="glass card span2" style={{ display: "grid", gap: 22, placeItems: "center", padding: "34px 18px" }} layout>
          <div style={{ opacity: running ? 1 : 0.5, transition: "opacity .3s" }}>
            {running ? <Runner size={180} speed={pace && pace < 400 ? 0.5 : 0.7} /> : <Runner size={180} speed={3} />}
          </div>
          <div className="live-time">{fmtDuration(elapsed)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 30, textAlign: "center" }}>
            <div><div className="eyebrow">Distance</div><div style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 800 }}>{s.distance.toFixed(2)}<small style={{ fontSize: 14, color: "var(--text-3)" }}> km</small></div></div>
            <div><div className="eyebrow">Avg pace</div><div style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 800, color: pace && pace < easy ? "#ffb48f" : undefined }}>{fmtPace(pace)}<small style={{ fontSize: 14, color: "var(--text-3)" }}> /km</small></div></div>
          </div>
          <div className="row" style={{ gap: 22, justifyContent: "center" }}>
            {s.startedAt && !running && <motion.button whileTap={{ scale: 0.9 }} className="live-btn stop" onClick={reset} aria-label="Discard"><RotateCcw size={26} /></motion.button>}
            {running
              ? <motion.button whileTap={{ scale: 0.9 }} className="live-btn go" onClick={pause} aria-label="Pause"><Pause size={34} /></motion.button>
              : <motion.button whileTap={{ scale: 0.9 }} className="live-btn go" onClick={start} aria-label={s.startedAt ? "Resume" : "Start"} animate={{ boxShadow: ["0 0 0 0 rgba(252,76,2,.6)", "0 0 0 22px rgba(252,76,2,0)"] }} transition={{ repeat: Infinity, duration: 1.6 }}><Play size={34} style={{ marginLeft: 4 }} /></motion.button>}
            {s.startedAt && <motion.button whileTap={{ scale: 0.9 }} className="live-btn stop" onClick={finish} aria-label="Finish and save"><Square size={26} /></motion.button>}
          </div>
          <div className="muted" style={{ fontSize: 13, textAlign: "center" }}>
            {!s.startedAt ? "Tap play to start" : running ? "Running… tap pause anytime" : "Paused — resume, finish ■ or discard ↺"}
          </div>
        </motion.div>
        <div className="glass card" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Settings</h3>
          <label className="goal" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={s.gps} onChange={(e) => setS({ ...s, gps: e.target.checked })} style={{ width: 20, height: 20, accentColor: "#FC4C02" }} />
            <div><div className="gt"><MapPin size={14} style={{ verticalAlign: -2 }} /> Track distance with GPS</div><div className="gs">Uses your phone&apos;s location. No account or API key.</div></div>
          </label>
          {gpsMsg && <div className="tag" style={{ justifySelf: "start" }}>{gpsMsg}</div>}
          <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            <b>Tips</b><br />
            · Keep this tab open with the screen on for best GPS.<br />
            · The timer survives refreshes — it&apos;s saved on this device.<br />
            · When you finish, the run form opens pre-filled. Adjust the distance if your watch shows something different.<br />
            · Easy pace target: <b>{fmtPace(easy)}/km or slower</b>.
          </div>
        </div>
      </div>
    </div>
  );
}
