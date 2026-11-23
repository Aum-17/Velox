"use client";
import { Check, Fingerprint, KeyRound, LogOut, Mail, Pencil, Trash2, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { authClient, hasRealEmail, signOut, useSession } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { looksLikeEmail, passwordError } from "@/lib/password";
import { PasswordRules } from "./PasswordRules";

type Panel = null | "name" | "username" | "email" | "password";

export function deviceName() {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : "This device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return br ? `${os} · ${br}` : os;
}

/** Profile: name, username, email, password, passkeys. Editing any of these never touches run data (it's keyed by account id). */
export function Profile() {
  const { data: session, refetch: refetchSession } = useSession();
  const { data: passkeys, refetch } = authClient.useListPasskeys();
  const { showToast, updateSettings } = useStore();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState({ name: "", username: "", email: "", current: "", next: "" });
  const [hasPassword, setHasPassword] = useState(true);
  const [supported, setSupported] = useState(false);

  const user = session?.user as (NonNullable<typeof session>["user"] & { username?: string | null; displayUsername?: string | null }) | undefined;
  const realEmail = hasRealEmail(user?.email);

  useEffect(() => { setSupported(!!window.PublicKeyCredential); }, []);
  useEffect(() => {
    authClient.listAccounts().then((r) => { if (r.data) setHasPassword(r.data.some((a) => a.providerId === "credential")); });
  }, [user?.id]);

  const open = (p: Panel) => {
    setErr(null);
    setV({ name: user?.name ?? "", username: user?.displayUsername || user?.username || "", email: "", current: "", next: "" });
    setPanel(panel === p ? null : p);
  };
  const run = async (fn: () => Promise<{ error?: { message?: string } | null } | undefined>, ok: string) => {
    setBusy(true); setErr(null);
    const r = await fn();
    setBusy(false);
    if (r?.error) { setErr(r.error.message || "That didn't work. Try again."); return; }
    showToast(ok); setPanel(null); refetchSession();
  };

  const saveName = () => run(async () => {
    const r = await authClient.updateUser({ name: v.name.trim() });
    if (!r.error) updateSettings({ athlete: v.name.trim().split(" ")[0] });
    return r;
  }, "Name updated");
  const saveUsername = () => {
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(v.username)) return setErr("3–30 letters, numbers, _ or .");
    return run(() => authClient.updateUser({ username: v.username.trim() }), "Username updated");
  };
  const saveEmail = () => {
    if (!looksLikeEmail(v.email)) return setErr("Enter a valid email address, like name@gmail.com.");
    return run(async () => {
      const r = await authClient.$fetch<{ status: boolean }>("/account/set-email", {
        method: "POST",
        body: { email: v.email.trim(), ...(hasPassword ? { password: v.current } : {}) },
      });
      if (r.error?.status === 429) return { error: { message: "Too many attempts. Wait a few minutes and try again." } };
      return r;
    }, realEmail ? "Email updated" : "Email added");
  };
  const savePassword = () => {
    const pwErr = passwordError(v.next);
    if (pwErr) return setErr(pwErr);
    return run(() => authClient.changePassword({ currentPassword: v.current, newPassword: v.next, revokeOtherSessions: true }), "Password changed");
  };

  const addPasskey = async () => {
    setBusy(true);
    const r = await authClient.passkey.addPasskey({ name: deviceName() });
    setBusy(false);
    if (r?.error) showToast(r.error.message || "Passkey was not added");
    else { showToast("Face ID / fingerprint sign-in is on"); refetch(); }
  };
  const removePasskey = async (id: string) => {
    const r = await authClient.passkey.deletePasskey({ id });
    if (r?.error) showToast(r.error.message || "Couldn't remove passkey");
    else { showToast("Passkey removed"); refetch(); }
  };

  const row = ({ icon, label, value, action, p }: { icon: ReactNode; label: string; value: ReactNode; action: string; p: Panel }) => (
    <div className="acct-row">
      <span className="acct-kv">{icon}<span><small>{label}</small>{value}</span></span>
      <button className="btn sm ghost" onClick={() => open(p)}>{panel === p ? <X size={15} /> : <Pencil size={14} />} {panel === p ? "Cancel" : action}</button>
    </div>
  );
  const edit = ({ children, onSave, hint }: { children: ReactNode; onSave: () => void; hint?: string }) => (
    <form className="acct-edit" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      {children}
      {hint && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{hint}</p>}
      {err && <p className="auth-err">{err}</p>}
      <button className="btn primary sm" disabled={busy}><Check size={15} /> Save</button>
    </form>
  );

  return (
    <div className="full acct">
      <div className="eyebrow">Profile</div>

      {row({ icon: <UserRound size={16} />, label: "Name", value: user?.name || "…", action: "Edit", p: "name" })}
      {panel === "name" && edit({ onSave: saveName, children: (
        <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required autoFocus />
      ) })}

      {row({ icon: <span className="acct-at">@</span>, label: "Username", value: user?.displayUsername || user?.username || <span className="muted">Not set</span>, action: user?.username ? "Edit" : "Add", p: "username" })}
      {panel === "username" && edit({ onSave: saveUsername, hint: "You can sign in with this instead of your email.", children: (
        <input className="input" value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoFocus />
      ) })}

      {row({ icon: <Mail size={16} />, label: "Email",
        value: realEmail ? <>{user?.email} {user?.emailVerified && <span className="acct-ok">verified</span>}</> : <span className="acct-warn">No email yet. Add one so you can reset your password.</span>,
        action: realEmail ? "Change" : "Add", p: "email" })}
      {panel === "email" && edit({ onSave: saveEmail, hint: "Saved right away. You can then use it to reset your password or sign in with Google on the same address.", children: (
        <>
          <input className="input" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} placeholder="you@gmail.com" maxLength={254} required autoFocus />
          {hasPassword && <input className="input" type="password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} placeholder="Current password (to confirm it's you)" autoComplete="current-password" required />}
        </>
      ) })}

      {hasPassword ? (
        <>
          {row({ icon: <KeyRound size={16} />, label: "Password", value: "••••••••", action: "Change", p: "password" })}
          {panel === "password" && edit({ onSave: savePassword, hint: "Your other devices will be signed out.", children: (
            <>
              <input className="input" type="password" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} placeholder="Current password" autoComplete="current-password" required autoFocus />
              <input className="input" type="password" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} placeholder="New password" autoComplete="new-password" maxLength={64} required />
              <PasswordRules value={v.next} />
            </>
          ) })}
        </>
      ) : (
        <div className="acct-row"><span className="acct-kv"><KeyRound size={16} /><span><small>Password</small>You sign in with Google.{realEmail ? " To add a password, use \u201cForgot password\u201d on the sign-in page." : ""}</span></span></div>
      )}

      <div className="eyebrow" style={{ marginTop: 6 }}>Face ID / fingerprint (passkeys)</div>
      {(passkeys ?? []).map((pk) => (
        <div key={pk.id} className="acct-row">
          <span className="acct-kv"><Fingerprint size={16} /><span><small>Added {new Date(pk.createdAt).toLocaleDateString()}</small>{pk.name || "Passkey"}</span></span>
          <button className="btn sm ghost danger" onClick={() => removePasskey(pk.id)} aria-label="Remove passkey"><Trash2 size={15} /></button>
        </div>
      ))}
      {supported ? (
        <button className="btn" onClick={addPasskey} disabled={busy}><Fingerprint size={16} /> {passkeys?.length ? "Add another device" : "Turn on Face ID / fingerprint sign-in"}</button>
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>This browser doesn't support passkeys.</p>
      )}

      <button className="btn ghost" style={{ marginTop: 6 }} onClick={async () => { await signOut(); window.location.href = "/login"; }}><LogOut size={15} /> Sign out</button>
    </div>
  );
}
