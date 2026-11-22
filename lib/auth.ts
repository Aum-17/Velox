// Server-only auth config (Better Auth). Kept free of "@/" imports so scripts/migrate.mts can load it too.
import { betterAuth } from "better-auth";
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
  user: { changeEmail: { enabled: true } },
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    passkey({ rpName: APP_NAME }),
    nextCookies(),
  ],
});

/** Accounts created without an email get a placeholder on this reserved domain until the user adds a real one. */
export const NO_EMAIL_DOMAIN = "no-email.invalid";

export type SessionUser = typeof auth.$Infer.Session.user;
