"use client";
import { motion } from "framer-motion";
import { ArrowLeft, Fingerprint, Loader2, Mail, MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { Logo } from "./Logo";
import { PasswordRules } from "./PasswordRules";
import { looksLikeEmail, passwordError } from "@/lib/password";

function errMsg(e: { message?: string; status?: number } | null | undefined, fallback = "Something went wrong. Try again.") {
  return e?.message || fallback;
}

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="ambient" aria-hidden><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /><div className="track" /><div className="grain" /></div>
      <main className="auth-wrap">
        <motion.section className="glass auth-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          <div className="auth-brand"><Logo size={40} /><span>VELOX<small>RUN LAB</small></span></div>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="muted auth-sub">{subtitle}</p>}
          {children}
        </motion.section>
      </main>
    </>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className="btn auth-wide" disabled={busy}
      onClick={async () => { setBusy(true); await authClient.signIn.social({ provider: "google", callbackURL: "/" }); setBusy(false); }}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      {label}
    </button>
  );
}

const Divider = () => <div className="auth-or"><span>or</span></div>;
const Err = ({ msg }: { msg: string | null }) => (msg ? <p className="auth-err" role="alert">{msg}</p> : null);

/* ---------------- Sign in ---------------- */
export function SignInForm({ google }: { google: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "passkey">(null);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);
  const [canPasskey, setCanPasskey] = useState(false);

  const done = () => { window.location.href = "/"; };

  useEffect(() => {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return;
    setCanPasskey(true);
    // Offer saved passkeys right in the email field's autofill (Safari/Chrome conditional UI)
    PublicKeyCredential.isConditionalMediationAvailable?.().then((ok) => {
      if (ok) authClient.signIn.passkey({ autoFill: true }).then((r) => { if (r?.data) done(); });
    });
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy("email"); setError(null); setUnverified(false);
    const id = email.trim();
    const { error } = id.includes("@")
      ? await authClient.signIn.email({ email: id, password, callbackURL: "/" })
      : await authClient.signIn.username({ username: id, password });
    setBusy(null);
    if (!error) return done();
    if (error.status === 403) { setUnverified(id.includes("@")); setError("Please verify your email first. Check your inbox for the link."); }
    else setError(error.status === 401 ? "Wrong username/email or password." : errMsg(error));
  };

  const passkey = async () => {
    setBusy("passkey"); setError(null);
    const r = await authClient.signIn.passkey();
    setBusy(null);
    if (r?.data) return done();
    if (r?.error) setError(errMsg(r.error, "Passkey sign-in was cancelled."));
  };

  const resend = async () => {
    await authClient.sendVerificationEmail({ email, callbackURL: "/" });
    setResent(true);
  };

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to see your runs.">
      {canPasskey && (
        <button type="button" className="btn primary auth-wide" onClick={passkey} disabled={!!busy}>
          {busy === "passkey" ? <Loader2 size={18} className="spin" /> : <Fingerprint size={18} />} Sign in with Face ID / fingerprint
        </button>
      )}
      {google && <GoogleButton label="Continue with Google" />}
      {(canPasskey || google) && <Divider />}
      <form onSubmit={onSubmit} className="auth-form">
        <div className="field"><label htmlFor="email">Email or username</label>
          <input id="email" className="input" required autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username webauthn" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com or username" /></div>
        <div className="field">
          <label htmlFor="password" className="auth-label-row">Password <Link href="/forgot-password" className="auth-link">Forgot password?</Link></label>
          <input id="password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Err msg={error} />
        {unverified && (
          <button type="button" className="btn sm" onClick={resend} disabled={resent}>
            <Mail size={15} /> {resent ? "Verification email sent" : "Resend verification email"}
          </button>
        )}
        <button className="btn auth-wide" disabled={!!busy}>{busy === "email" && <Loader2 size={18} className="spin" />} Sign in with email</button>
      </form>
      <p className="auth-foot">New here? <Link href="/signup" className="auth-link">Create an account</Link></p>
    </AuthFrame>
  );
}

/* ---------------- Sign up ---------------- */
export function SignUpForm({ google, verify = true }: { google: boolean; verify?: boolean }) {
  const [f, setF] = useState({ name: "", username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(f.username)) return setError("Username: 3–30 letters, numbers, _ or .");
    if (!looksLikeEmail(f.email)) return setError("Enter a valid email address, like name@gmail.com.");
    const pwErr = passwordError(f.password);
    if (pwErr) return setError(pwErr);
    setBusy(true); setError(null);
    const { error } = await authClient.signUp.email({ name: f.name.trim(), username: f.username.trim(), email: f.email.trim(), password: f.password, callbackURL: "/" });
    setBusy(false);
    if (error) return setError(errMsg(error));
    // Without required verification the account is signed in straight away.
    if (!verify) { window.location.href = "/"; return; }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthFrame title="Check your inbox" subtitle={<>We sent a verification link to <b>{f.email}</b>. Open it to activate your account and you&apos;ll be signed in automatically.</>}>
        <div className="auth-icon"><MailCheck size={40} /></div>
        <p className="muted" style={{ fontSize: 13 }}>Nothing yet? Check spam, or <button className="auth-link" onClick={() => authClient.sendVerificationEmail({ email: f.email, callbackURL: "/" })}>send it again</button>.</p>
        <p className="auth-foot"><Link href="/login" className="auth-link"><ArrowLeft size={14} /> Back to sign in</Link></p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create your account" subtitle="Start logging runs. Your data is private to your account.">
      {google && <><GoogleButton label="Sign up with Google" /><Divider /></>}
      <form onSubmit={onSubmit} className="auth-form">
        <div className="field"><label htmlFor="name">Name</label>
          <input id="name" className="input" required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="username">Username</label>
          <input id="username" className="input" required autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="e.g. fast_runner" /></div>
        <div className="field"><label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@gmail.com" /></div>
        <div className="field"><label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="e.g. Runner#2026" maxLength={64} />
          <PasswordRules value={f.password} /></div>
        <Err msg={error} />
        <button className="btn primary auth-wide" disabled={busy}>{busy && <Loader2 size={18} className="spin" />} Create account</button>
      </form>
      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>After you sign in, you can turn on Face ID / fingerprint sign-in in Settings.</p>
      <p className="auth-foot">Already have an account? <Link href="/login" className="auth-link">Sign in</Link></p>
    </AuthFrame>
  );
}

/* ---------------- Forgot password ---------------- */
export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const { error } = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
    setBusy(false);
    if (error) return setError(errMsg(error));
    setSent(true);
  };

  return (
    <AuthFrame title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={sent ? <>If an account exists for <b>{email}</b>, a reset link is on its way. It works for 1 hour.</> : "Enter your email and we'll send you a link to set a new one."}>
      {sent ? <div className="auth-icon"><MailCheck size={40} /></div> : (
        <form onSubmit={onSubmit} className="auth-form">
          <div className="field"><label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Err msg={error} />
          <button className="btn primary auth-wide" disabled={busy}>{busy && <Loader2 size={18} className="spin" />} Send reset link</button>
        </form>
      )}
      <p className="auth-foot"><Link href="/login" className="auth-link"><ArrowLeft size={14} /> Back to sign in</Link></p>
    </AuthFrame>
  );
}

/* ---------------- Reset password ---------------- */
export function ResetForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || invalid) {
    return (
      <AuthFrame title="Link expired" subtitle="This reset link is invalid or has expired. Request a new one.">
        <Link href="/forgot-password" className="btn primary auth-wide">Get a new link</Link>
      </AuthFrame>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const pwErr = passwordError(pw);
    if (pwErr) return setError(pwErr);
    if (pw !== pw2) return setError("The passwords don't match.");
    setBusy(true); setError(null);
    const { error } = await authClient.resetPassword({ newPassword: pw, token });
    setBusy(false);
    if (error) return setError(errMsg(error, "This link has expired. Request a new one."));
    setDone(true);
  };

  if (done) {
    return (
      <AuthFrame title="Password updated" subtitle="You can now sign in with your new password.">
        <Link href="/login" className="btn primary auth-wide">Sign in</Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Set a new password">
      <form onSubmit={onSubmit} className="auth-form">
        <div className="field"><label htmlFor="pw">New password</label>
          <input id="pw" className="input" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} maxLength={64} />
          <PasswordRules value={pw} /></div>
        <div className="field"><label htmlFor="pw2">Confirm password</label>
          <input id="pw2" className="input" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
        <Err msg={error} />
        <button className="btn primary auth-wide" disabled={busy}>{busy && <Loader2 size={18} className="spin" />} Update password</button>
      </form>
    </AuthFrame>
  );
}
