// Creates the owner account (username + password) and gives it the original run log.
// Safe to run any number of times: if the account already exists, NOTHING is changed
// (password, profile and run data are left exactly as they are).
import type { Pool } from "pg";

type Auth = typeof import("../lib/auth.ts").auth;

export async function ensureOwner(auth: Auth, pool: Pool, opts: { username: string; password: string; name: string }) {
  const username = opts.username.trim().toLowerCase();
  const { rows } = await pool.query<{ id: string }>(`select id from "user" where username = $1`, [username]);
  if (rows[0]) {
    console.log(`[owner] account "${username}" already exists; leaving it untouched.`);
    return;
  }
  const { NO_EMAIL_DOMAIN, passwordProblem } = await import("../lib/auth.ts");
  const problem = passwordProblem(opts.password);
  if (problem) throw new Error(`OWNER_PASSWORD: ${problem}`);
  const { seedData } = await import("../lib/seed.ts");
  const ctx = await auth.$context;

  const user = await ctx.internalAdapter.createUser({
    name: opts.name,
    email: `${username}@${NO_EMAIL_DOMAIN}`, // placeholder until they add a real email in Profile
    emailVerified: true,
    username,
    displayUsername: opts.username.trim(),
  } as Parameters<typeof ctx.internalAdapter.createUser>[0]);
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(opts.password),
  });

  const data = seedData();
  data.settings.athlete = opts.name.split(" ")[0] || data.settings.athlete;
  await pool.query(`insert into user_data (user_id, data, is_owner) values ($1, $2, true)`, [user.id, data]);
  console.log(`[owner] created "${username}" with ${data.runs.length} runs and ${data.goals.length} planned goals.`);
}
