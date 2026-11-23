import { headers } from "next/headers";
import { auth, emailVerificationRequired, pool } from "@/lib/auth";

export const dynamic = "force-dynamic";

/*
 * Add or change the signed-in user's email. Saved immediately (no confirmation link needed), so it works for
 * username/password accounts — including ones created without an email — even when outgoing email can't reach
 * them. The new address starts unverified; once set, signing in with Google on that same address links to this
 * account automatically (accountLinking is enabled for Google).
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (email === session.user.email.toLowerCase()) {
    return Response.json({ error: "That's already your email." }, { status: 400 });
  }

  const { rows } = await pool.query<{ id: string }>(`select id from "user" where lower(email) = $1 and id <> $2 limit 1`, [email, session.user.id]);
  if (rows[0]) {
    return Response.json({ error: "That email is already used by another Velox account. Sign in to that one, or use a different email." }, { status: 409 });
  }

  try {
    await pool.query(`update "user" set email = $1, "emailVerified" = false, "updatedAt" = now() where id = $2`, [email, session.user.id]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") {
      return Response.json({ error: "That email is already used by another Velox account." }, { status: 409 });
    }
    console.error("Email update failed:", e);
    return Response.json({ error: "Couldn't save your email. Please try again." }, { status: 500 });
  }

  // Best effort: send a verification link when real email delivery is set up. The email is saved either way.
  if (emailVerificationRequired) {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/" } }).catch((e) => console.error("Verification email failed:", e));
  }

  return Response.json({ ok: true, email });
}
