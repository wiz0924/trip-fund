import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query } from "./db";

export const COOKIE_NAME = "tripfund_session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Generate one (e.g. `openssl rand -base64 32`) and add it to your environment variables."
    );
  }
  return secret;
}

export function signSession(userId) {
  return jwt.sign({ uid: userId }, getSecret(), { expiresIn: "30d" });
}

export function verifySession(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Reads the session cookie (server components / route handlers), verifies it,
// and loads the current user from the database. Returns null if not signed in.
export async function getCurrentUser() {
  const store = cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload?.uid) return null;
  const { rows } = await query(
    "SELECT id, username, name, role FROM users WHERE id = $1",
    [payload.uid]
  );
  return rows[0] || null;
}

export function toPublicUser(row) {
  if (!row) return null;
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}
