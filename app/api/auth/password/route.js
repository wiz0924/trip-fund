import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser, comparePassword, hashPassword } from "@/lib/auth";

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { current, next } = await req.json();
  if (!current || !next || next.length < 4) {
    return NextResponse.json(
      { error: "Current password required; new password needs at least 4 characters." },
      { status: 400 }
    );
  }

  const { rows } = await query("SELECT * FROM users WHERE id = $1", [user.id]);
  const row = rows[0];
  const ok = await comparePassword(current, row.password_hash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const hash = await hashPassword(next);
  await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, user.id]);
  return NextResponse.json({ ok: true });
}
