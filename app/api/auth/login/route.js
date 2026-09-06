import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { comparePassword, signSession, COOKIE_NAME, toPublicUser } from "@/lib/auth";

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const { rows } = await query(
    "SELECT * FROM users WHERE lower(username) = lower($1)",
    [username]
  );
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const token = signSession(user.id);
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
