// Creates/updates the database tables (auth + per-user run data), and the owner account if configured.
// Runs automatically before `npm run build` (so every Vercel deploy is migrated), or manually: `npm run db:migrate`.
import { existsSync, readFileSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL not set; skipping database migration.");
  process.exit(0);
}

const { getMigrations } = await import("better-auth/db/migration");
const { auth, pool } = await import("../lib/auth.ts");

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
if (toBeCreated.length || toBeAdded.length) {
  console.log("[migrate] auth tables:", [...toBeCreated, ...toBeAdded].map((t) => t.table).join(", "));
  await runMigrations();
}

await pool.query(`
  create table if not exists user_data (
    user_id    text primary key references "user"(id) on delete cascade,
    data       jsonb not null,
    updated_at timestamptz not null default now()
  )`);
await pool.query(`alter table user_data add column if not exists is_owner boolean not null default false`);

// Owner account: set OWNER_USERNAME + OWNER_PASSWORD (+ optional OWNER_NAME) and it is created on the next build/migrate.
if (process.env.OWNER_USERNAME && process.env.OWNER_PASSWORD) {
  const { ensureOwner } = await import("./owner.mts");
  await ensureOwner(auth, pool, {
    username: process.env.OWNER_USERNAME,
    password: process.env.OWNER_PASSWORD,
    name: process.env.OWNER_NAME || process.env.OWNER_USERNAME,
  });
}

console.log("[migrate] database is up to date.");
await pool.end();
