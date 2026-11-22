import { headers } from "next/headers";
import { auth, pool } from "@/lib/auth";
import { blankData } from "@/lib/defaults";
import { seedData } from "@/lib/seed";
import type { AppData } from "@/lib/types";

export const dynamic = "force-dynamic";

/*
 * Each account's data lives in its own row, keyed by user id. Changing name, username,
 * email or password never touches it.
 * The original run log is only ever written by `npm run create-owner`, which flags that one row
 * with is_owner. New accounts always start at zero.
 */

async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

const unauthorized = () => Response.json({ error: "Not signed in" }, { status: 401 });

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { rows } = await pool.query<{ data: AppData; is_owner: boolean }>("select data, is_owner from user_data where user_id = $1", [user.id]);
  if (rows[0]) return Response.json({ data: rows[0].data, owner: rows[0].is_owner });
  const data = blankData(user.name);
  await pool.query("insert into user_data (user_id, data) values ($1, $2) on conflict (user_id) do nothing", [user.id, data]);
  return Response.json({ data, owner: false });
}

export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const body = (await req.json().catch(() => null)) as AppData | null;
  if (!body || !Array.isArray(body.runs) || !Array.isArray(body.goals) || typeof body.settings !== "object") {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }
  const text = JSON.stringify(body);
  if (text.length > 2_000_000) return Response.json({ error: "Data too large" }, { status: 413 });
  await pool.query(
    `insert into user_data (user_id, data, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [user.id, text]
  );
  return Response.json({ ok: true });
}

/** Reset: the owner gets the original log back, everyone else gets a blank slate. */
export async function DELETE() {
  const user = await currentUser();
  if (!user) return unauthorized();
  const { rows } = await pool.query<{ is_owner: boolean; data: AppData }>("select is_owner, data from user_data where user_id = $1", [user.id]);
  const owner = !!rows[0]?.is_owner;
  const data = owner ? { ...seedData(), settings: { ...seedData().settings, athlete: rows[0].data.settings?.athlete || "Runner" } } : blankData(user.name);
  await pool.query(
    `insert into user_data (user_id, data, updated_at) values ($1, $2, now())
     on conflict (user_id) do update set data = excluded.data, updated_at = now()`,
    [user.id, data]
  );
  return Response.json({ data, owner });
}
