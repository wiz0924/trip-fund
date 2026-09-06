import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  }
  await query("DELETE FROM users WHERE id = $1", [params.id]);
  return NextResponse.json({ ok: true });
}
