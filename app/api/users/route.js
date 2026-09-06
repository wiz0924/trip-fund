import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { rows } = await query(
    "SELECT id, username, name, role FROM users ORDER BY created_at ASC"
  );
  return NextResponse.json({ users: rows });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { name, username, password, role } = await req.json();
  if (!name?.trim() || !username?.trim() || !password || password.length < 4) {
    return NextResponse.json(
      { error: "Name, username, and a password of at least 4 characters are required." },
      { status: 400 }
    );
  }

  const existing = await query("SELECT id FROM users WHERE lower(username) = lower($1)", [username]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const hash = await hashPassword(password);
  const id = randomUUID();
  await query(
    "INSERT INTO users (id, username, password_hash, name, role) VALUES ($1,$2,$3,$4,$5)",
    [id, username.trim(), hash, name.trim(), role === "admin" ? "admin" : "member"]
  );
  return NextResponse.json({ user: { id, username: username.trim(), name: name.trim(), role } });
}
