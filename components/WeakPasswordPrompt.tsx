"use client";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { passwordError } from "@/lib/password";
import { useStore } from "@/lib/store";
import { Modal } from "./ui";
import { PasswordRules } from "./PasswordRules";

const KEY = "velox:pw-prompt-later";

/**
 * Shown to existing users whose password was set before the current rules. Their old password keeps working;
 * this just asks them to update it. "Later" hides it for this browser session; it comes back next session.
 */
export function WeakPasswordPrompt() {
  const { data: session, refetch } = useSession();
  const { showToast } = useStore();
  const weak = !!(session?.user as { passwordWeak?: boolean } | undefined)?.passwordWeak;
  const [later, setLater] = useState(true);
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try { setLater(sessionStorage.getItem(KEY) === "1"); } catch { setLater(false); }
  }, []);

  const close = () => { setLater(true); try { sessionStorage.setItem(KEY, "1"); } catch {} };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const pwErr = passwordError(f.next);
    if (pwErr) return setErr(pwErr);
    if (f.next !== f.confirm) return setErr("The new passwords don't match.");
    if (f.next === f.current) return setErr("Choose a different password from your current one.");
    setBusy(true); setErr(null);
    const r = await authClient.changePassword({ currentPassword: f.current, newPassword: f.next, revokeOtherSessions: true });
    setBusy(false);
    if (r.error) return setErr(r.error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : r.error.message || "That didn't work. Check your current password.");
    showToast("Password updated. Your account is more secure now.");
    setF({ current: "", next: "", confirm: "" });
    refetch();
  };

  return (
    <Modal open={weak && !later} onClose={close} title="Update your password">
      <form className="auth-form" onSubmit={submit}>
        <p className="muted" style={{ margin: 0, fontSize: 14, display: "flex", gap: 10 }}>
          <ShieldAlert size={20} style={{ flex: "none", color: "#ffb547" }} />
          For your security, Velox now requires stronger passwords. Your current password still works, but please update it to one that meets the rules below.
        </p>
        <div className="field"><label htmlFor="wp-cur">Current password</label>
          <input id="wp-cur" className="input" type="password" autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></div>
        <div className="field"><label htmlFor="wp-new">New password</label>
          <input id="wp-new" className="input" type="password" autoComplete="new-password" required maxLength={64} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
          <PasswordRules value={f.next} /></div>
        <div className="field"><label htmlFor="wp-new2">Confirm new password</label>
          <input id="wp-new2" className="input" type="password" autoComplete="new-password" required maxLength={64} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
        {err && <p className="auth-err" role="alert">{err}</p>}
        <button className="btn primary auth-wide" disabled={busy}>{busy && <Loader2 size={18} className="spin" />} Update password</button>
        <button type="button" className="btn ghost auth-wide" onClick={close}>Remind me later</button>
      </form>
    </Modal>
  );
}
