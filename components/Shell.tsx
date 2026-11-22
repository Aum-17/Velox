"use client";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Activity, Award, CalendarRange, Home, Play, Plus, Settings, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { Logo } from "./Logo";
import { Dashboard } from "./Dashboard";
import { Activities } from "./Activities";
import { Weekly } from "./Weekly";
import { Goals } from "./Goals";
import { Insights } from "./Insights";
import { LiveRun } from "./LiveRun";
import { RunForm } from "./RunForm";
import { Celebration } from "./Celebration";
import { SettingsSheet } from "./SettingsSheet";
import { Intro } from "./Intro";
import { deviceName } from "./Profile";
import { authClient } from "@/lib/auth-client";
import { Fingerprint, X } from "lucide-react";

const TABS = [
  { id: "home", label: "Dashboard", short: "Home", icon: Home },
  { id: "runs", label: "Activities", short: "Runs", icon: Activity },
  { id: "weekly", label: "Weekly", short: "Weekly", icon: CalendarRange },
  { id: "goals", label: "Goals", short: "Goals", icon: Target },
  { id: "insights", label: "Insights", short: "Stats", icon: Award },
  { id: "live", label: "Live", short: "Live", icon: Play },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Clock() {
  const now = useNow(1000);
  return (
    <div className="clock" suppressHydrationWarning>
      <b>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b><br />
      {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
    </div>
  );
}

function Inner() {
  const { ready, openRunForm, syncState, data } = useStore();
  const [tab, setTab] = useState<TabId>("home");
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    const h = window.location.hash.slice(1) as TabId;
    if (TABS.some((t) => t.id === h)) setTab(h);
    const onHash = () => { const x = window.location.hash.slice(1) as TabId; if (TABS.some((t) => t.id === x)) setTab(x); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((t: string) => {
    setTab(t as TabId);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!ready) {
    return (
      <div className="splash">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring" }}><Logo size={72} /></motion.div>
      </div>
    );
  }

  const bottom = [TABS[0], TABS[1], null, TABS[2], TABS[3], TABS[4]];

  return (
    <>
      <div className="ambient" aria-hidden><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="track" /><div className="grain" /></div>
      <div className="app">
        <header className="topbar">
          <button className="brand" onClick={() => go("home")} aria-label="Velox home">
            <motion.span whileHover={{ rotate: -8, scale: 1.08 }} style={{ display: "flex" }}><Logo size={36} /></motion.span>
            <span style={{ textAlign: "left" }}>VELOX<small>RUN LAB</small></span>
          </button>
          <div className="spacer" />
          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}>
                {tab === t.id && <motion.span layoutId="tabpill" className="pill" transition={{ type: "spring", damping: 26, stiffness: 340 }} />}
                <t.icon size={15} /><span>{t.label}</span>
              </button>
            ))}
          </nav>
          <div className="spacer" />
          <Clock />
          <button className="btn icon" onClick={() => go("live")} aria-label="Live run" title="Live run" style={{ display: tab === "live" ? "none" : undefined }}><Play size={17} /></button>
          <button className="btn icon" onClick={() => setSettings(true)} aria-label="Settings" title="Settings"><Settings size={17} /></button>
          <button className="btn primary sm" onClick={() => openRunForm()}><Plus size={16} /><span className="hide-sm">Log run</span></button>
        </header>

        <PasskeyNudge onOpen={() => setSettings(true)} />
        <main>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(6px)" }} transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}>
              {tab === "home" && <Dashboard go={go} />}
              {tab === "runs" && <Activities />}
              {tab === "weekly" && <Weekly />}
              {tab === "goals" && <Goals />}
              {tab === "insights" && <Insights />}
              {tab === "live" && <LiveRun />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer style={{ textAlign: "center", color: "var(--text-3)", fontSize: 12, marginTop: 40 }}>
          <span className={`sync-dot ${syncState}`} />{syncState === "error" ? "Not synced, changes will retry" : syncState === "saving" ? "Saving…" : "Synced to your account"} · Velox Run Lab
        </footer>
      </div>

      <nav className="bottomnav" aria-label="Sections">
        {bottom.map((t, i) =>
          t === null ? (
            <motion.button key="fab" whileTap={{ scale: 0.9 }} className="fab-center" onClick={() => openRunForm()} aria-label="Log run"><Plus size={26} /></motion.button>
          ) : (
            <button key={t.id + i} className={`bn ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}>
              {tab === t.id && <motion.span layoutId="bndot" className="dot" />}
              <t.icon size={21} />{t.short}
            </button>
          )
        )}
      </nav>

      <RunForm />
      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      <Celebration />
      <Intro runs={data.runs} weeklyGoal={data.settings.weeklyKmGoal} />
    </>
  );
}

export function Shell() {
  return <StoreProvider><MotionConfig reducedMotion="user"><Inner /></MotionConfig></StoreProvider>;
}

/** One-time prompt after sign-in to turn on Face ID / fingerprint login. */
function PasskeyNudge({ onOpen }: { onOpen: () => void }) {
  const { data: passkeys, isPending } = authClient.useListPasskeys();
  const { showToast } = useStore();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem("velox:passkey-nudge") === "1"; } catch {}
    setHidden(dismissed || !window.PublicKeyCredential);
  }, []);
  if (hidden || isPending || (passkeys && passkeys.length)) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem("velox:passkey-nudge", "1"); } catch {} };
  const add = async () => {
    const r = await authClient.passkey.addPasskey({ name: deviceName() });
    if (r?.error) { showToast(r.error.message || "Passkey was not added"); return; }
    showToast("Face ID / fingerprint sign-in is on");
    dismiss();
  };
  return (
    <div className="glass card row" style={{ marginTop: 14, justifyContent: "space-between" }}>
      <span style={{ fontSize: 14 }}><Fingerprint size={18} style={{ verticalAlign: "-4px", marginRight: 8, color: "var(--accent)" }} />Sign in faster next time with Face ID or your fingerprint.</span>
      <span className="row">
        <button className="btn primary sm" onClick={add}>Turn on</button>
        <button className="btn ghost sm" onClick={onOpen}>Settings</button>
        <button className="btn icon ghost" onClick={dismiss} aria-label="Dismiss"><X size={16} /></button>
      </span>
    </div>
  );
}
