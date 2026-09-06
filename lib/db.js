import { Pool } from "pg";
import bcrypt from "bcryptjs";

let pool;
function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Add a Postgres connection string (Vercel Postgres, Neon, or Supabase all work) to your environment variables."
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

let schemaReady = null;
export async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        destination TEXT DEFAULT '',
        start_date DATE,
        end_date DATE,
        description TEXT DEFAULT '',
        target NUMERIC NOT NULL DEFAULT 0,
        weekly_amount NUMERIC NOT NULL DEFAULT 0,
        data JSONB NOT NULL DEFAULT '{"members":[],"contributions":[],"expenses":[],"budgets":{}}',
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Seed a default admin account if no users exist yet.
    const { rows } = await db.query("SELECT COUNT(*)::int AS count FROM users");
    if (rows[0].count === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await db.query(
        "INSERT INTO users (id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)",
        ["admin-default", "admin", hash, "Admin", "admin"]
      );
    }
  })();
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}
