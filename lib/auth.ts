// Server-only auth config (Better Auth). Kept free of "@/" imports so scripts/migrate.mts can load it too.
import { resolveMx } from "node:dns/promises";
import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, sessionMiddleware } from "better-auth/api";
import { z } from "zod";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { Pool } from "pg";
import { Resend } from "resend";

const g = globalThis as unknown as { __veloxPool?: Pool };
export const pool =
  g.__veloxPool ??
  (g.__veloxPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? undefined : { rejectUnauthorized: false },
  }));

const APP_NAME = "Velox Run Lab";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || "Velox Run Lab <onboarding@resend.dev>";

/**
 * Email verification is only enforced once emails can reach anyone: a Resend key plus a sender on your own
 * verified domain (onboarding@resend.dev only delivers to the Resend account owner). Override with
 * REQUIRE_EMAIL_VERIFICATION=true|false.
 */
export const emailVerificationRequired =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true" ||
  (process.env.REQUIRE_EMAIL_VERIFICATION !== "false" && !!resend && !FROM.includes("@resend.dev"));

const esc = (x: string) => x.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function sendEmail(to: string, subject: string, heading: string, body: string, cta: string, url: string) {
  const html = `<!doctype html><html><body style="margin:0;background:#07080c;font-family:Inter,Arial,sans-serif;color:#eef0f6">
  <div style="max-width:480px;margin:0 auto;padding:40px 24px">
    <div style="font-weight:800;letter-spacing:2px;color:#fc4c02;font-size:14px">VELOX · RUN LAB</div>
    <h1 style="font-size:24px;margin:18px 0 8px">${heading}</h1>
    <p style="color:#a7abb9;line-height:1.6;font-size:15px">${body}</p>
    <a href="${url}" style="display:inline-block;margin:18px 0;background:#fc4c02;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">${cta}</a>
    <p style="color:#6b7080;font-size:12px;line-height:1.6">Or paste this link into your browser:<br><span style="word-break:break-all">${url}</span></p>
    <p style="color:#6b7080;font-size:12px">If you didn't ask for this, you can ignore this email.</p>
  </div></body></html>`;
  if (!resend) {
    // Local dev without an email key: print the link so you can still click through.
    console.log(`\n[email → ${to}] ${subject}\n${url}\n`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("Email send failed:", error);
}


/* ---------------- Password policy (mirrored for the UI in lib/password.ts; keep both in sync) ---------------- */
export const PASSWORD_SYMBOLS = "!@#$%^&*()-_+=?.";
const PW_ALLOWED = /^[A-Za-z0-9!@#$%^&*()\-_+=?.]+$/;
/** Returns null when the password is OK, otherwise a message explaining what's missing. */
export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 64) return "Password must be 64 characters or fewer.";
  if (!PW_ALLOWED.test(pw)) return `Password can only use letters, numbers and these symbols: ${PASSWORD_SYMBOLS.split("").join(" ")}`;
  if (!/[A-Z]/.test(pw)) return "Password needs at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password needs at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password needs at least one number.";
  if (!/[!@#$%^&*()\-_+=?.]/.test(pw)) return `Password needs at least one symbol (${PASSWORD_SYMBOLS.split("").join(" ")}).`;
  return null;
}

/* ---------------- Email checks: real format, real mail domain, no throwaway inboxes ---------------- */
const EMAIL_RE = /^[A-Za-z0-9._%+-]{1,64}@(?=.{4,253}$)([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
const DISPOSABLE = new Set(["mailinator.com", "yopmail.com", "guerrillamail.com", "sharklasers.com", "10minutemail.com", "temp-mail.org",
  "tempmail.com", "trashmail.com", "dispostable.com", "getnada.com", "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mailnesia.com", "moakt.com", "tempmail.dev"]);
const TYPOS: Record<string, string> = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com",
  "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com", "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com",
  "outlok.com": "outlook.com", "outlook.co": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com" };

/** Returns null when the address looks real and its domain can receive mail, otherwise a user-facing message. */
export async function emailProblem(raw: unknown): Promise<string | null> {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.includes("..")) return "Enter a valid email address, like name@gmail.com.";
  const domain = email.split("@")[1];
  if (domain.endsWith("." + NO_EMAIL_DOMAIN.split(".").pop()) || domain === NO_EMAIL_DOMAIN) return "Enter a real email address.";
  if (TYPOS[domain]) return `Did you mean ${email.split("@")[0]}@${TYPOS[domain]}?`;
  if (DISPOSABLE.has(domain)) return "Temporary/disposable email addresses aren't allowed. Use your real email.";
  try {
    const mx = await Promise.race([resolveMx(domain), new Promise<null>((r) => setTimeout(() => r(null), 4000))]);
    if (mx && !mx.some((m) => m.exchange && m.exchange !== ".")) return `${domain} can't receive email. Check the address.`;
  } catch (e) {
    const code = (e as { code?: string }).code;
    // Only reject when DNS clearly says the domain has no mail servers; transient DNS errors shouldn't block anyone.
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "ESERVFAIL") return `${domain} doesn't look like a real email domain. Check the address.`;
  }
  return null;
}

const sql = (q: string, params: unknown[]) => pool.query(q, params).catch((e) => console.error("[auth] db update failed:", e));

/**
 * POST /api/auth/account/set-email — add or change the signed-in user's email. Saved immediately (no link to click),
 * so it works for username accounts even when outgoing email can't reach them. Accounts with a password must confirm
 * it, so a stolen/left-open session can't hijack the account's recovery email. Rate-limited by Better Auth.
 */
const accountEmail = {
  id: "velox-account-email",
  endpoints: {
    setEmail: createAuthEndpoint("/account/set-email", {
      method: "POST",
      body: z.object({ email: z.string().max(254), password: z.string().max(128).optional() }),
      use: [sessionMiddleware],
    }, async (ctx) => {
      const user = ctx.context.session.user;
      const email = ctx.body.email.trim().toLowerCase();
      const problem = await emailProblem(email);
      if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      if (email === user.email.toLowerCase()) throw new APIError("BAD_REQUEST", { message: "That's already your email." });

      const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
      const credential = accounts.find((a) => a.providerId === "credential" && a.password);
      if (credential) {
        if (!ctx.body.password) throw new APIError("BAD_REQUEST", { message: "Enter your current password to change your email." });
        const ok = await ctx.context.password.verify({ hash: credential.password!, password: ctx.body.password });
        if (!ok) throw new APIError("BAD_REQUEST", { message: "Current password is incorrect." });
      }

      const existing = await ctx.context.internalAdapter.findUserByEmail(email);
      if (existing && existing.user.id !== user.id) {
        throw new APIError("BAD_REQUEST", { message: "That email is already used by another Velox account. Sign in to that one, or use a different email." });
      }

      await ctx.context.internalAdapter.updateUser(user.id, { email, emailVerified: false });
      if (emailVerificationRequired) {
        await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/" } }).catch((e) => console.error("Verification email failed:", e));
      }
      return ctx.json({ status: true, email });
    }),
  },
} satisfies BetterAuthPlugin;

const PW_FIELD: Record<string, string> = { "/sign-up/email": "password", "/change-password": "newPassword", "/reset-password": "newPassword", "/set-password": "newPassword" };

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account" as const } }
    : undefined;

export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailVerificationRequired,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail(user.email, "Reset your Velox password", "Reset your password",
        "Someone (hopefully you) asked to reset the password for your Velox account. This link works for 1 hour.", "Choose a new password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: emailVerificationRequired,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail(user.email, "Verify your email for Velox", `Welcome, ${esc(user.name || "runner")}!`,
        "Confirm your email to activate your Velox account. This keeps your account recoverable if you ever forget your password.", "Verify email", url);
    },
  },
  socialProviders: google,
  user: {
    // Email changes go through /account/set-email (above), never Better Auth's link-based flow.
    changeEmail: { enabled: false },
    additionalFields: {
      // Set on each password sign-in: true when the password predates the current rules. Drives the "update your password" popup.
      passwordWeak: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    storage: "database", // shared across serverless instances (memory storage resets per instance)
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/*": { window: 300, max: 10 },
      "/sign-up/*": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/reset-password": { window: 900, max: 5 },
      "/change-password": { window: 900, max: 5 },
      "/send-verification-email": { window: 3600, max: 5 },
      "/account/set-email": { window: 900, max: 5 },
    },
  },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const field = PW_FIELD[ctx.path];
      if (field) {
        const problem = passwordProblem((ctx.body as Record<string, unknown> | undefined)?.[field]);
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }
      if (ctx.path === "/sign-up/email") {
        const problem = await emailProblem((ctx.body as { email?: unknown } | undefined)?.email);
        if (problem) throw new APIError("BAD_REQUEST", { message: problem });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const body = ctx.body as { password?: unknown } | undefined;
      if ((ctx.path === "/sign-in/email" || ctx.path === "/sign-in/username") && ctx.context.newSession) {
        await sql(`update "user" set "passwordWeak" = $1 where id = $2`, [passwordProblem(body?.password) !== null, ctx.context.newSession.user.id]);
      }
      if (ctx.path === "/change-password" && ctx.context.session && !(ctx.context.returned instanceof Error)) {
        await sql(`update "user" set "passwordWeak" = false where id = $1`, [ctx.context.session.user.id]);
      }
    }),
  },
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    passkey({ rpName: APP_NAME }),
    accountEmail,
    nextCookies(),
  ],
});

/** Accounts created without an email get a placeholder on this reserved domain until the user adds a real one. */
export const NO_EMAIL_DOMAIN = "no-email.invalid";

export type SessionUser = typeof auth.$Infer.Session.user;
