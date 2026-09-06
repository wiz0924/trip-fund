import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination || "",
    startDate: row.start_date ? row.start_date.toISOString().slice(0, 10) : "",
    endDate: row.end_date ? row.end_date.toISOString().slice(0, 10) : "",
    createdAt: row.created_at ? row.created_at.toISOString().slice(0, 10) : "",
    description: row.description || "",
    target: Number(row.target) || 0,
    weeklyAmount: Number(row.weekly_amount) || 0,
    members: row.data?.members || [],
    contributions: row.data?.contributions || [],
    expenses: row.data?.expenses || [],
    budgets: row.data?.budgets || {},
  };
}

// Server-side sanity checks on the financial transaction lists.
// Rejects invalid amounts rather than trusting the client blindly.
const MAX_PHOTO_CHARS = 2_000_000; // ~1.5MB of image data, base64-encoded

function validateData(data) {
  if (!data) return null;
  for (const c of data.contributions || []) {
    if (!(Number(c.amount) > 0)) return "Every contribution needs an amount greater than zero.";
    if (!c.memberId || !c.date) return "Every contribution needs a member and a date.";
    if (c.photo && c.photo.length > MAX_PHOTO_CHARS) return "That receipt photo is too large. Try a smaller image.";
  }
  for (const e of data.expenses || []) {
    if (!(Number(e.amount) > 0)) return "Every expense needs an amount greater than zero.";
    if (!e.name || !e.date) return "Every expense needs a name and a date.";
    if (e.photo && e.photo.length > MAX_PHOTO_CHARS) return "That receipt photo is too large. Try a smaller image.";
  }
  return null;
}

export async function PATCH(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();

  if (body.data) {
    const err = validateData(body.data);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const { rows: existingRows } = await query("SELECT * FROM trips WHERE id = $1", [params.id]);
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  const merged = {
    name: body.name ?? existing.name,
    destination: body.destination ?? existing.destination,
    start_date: body.startDate ?? existing.start_date,
    end_date: body.endDate ?? existing.end_date,
    description: body.description ?? existing.description,
    target: body.target !== undefined ? Number(body.target) || 0 : existing.target,
    weekly_amount: body.weeklyAmount !== undefined ? Number(body.weeklyAmount) || 0 : existing.weekly_amount,
    data: body.data ?? existing.data,
  };

  const { rows } = await query(
    `UPDATE trips SET name=$1, destination=$2, start_date=$3, end_date=$4, description=$5,
       target=$6, weekly_amount=$7, data=$8, updated_at=now()
     WHERE id=$9 RETURNING *`,
    [
      merged.name,
      merged.destination,
      merged.start_date,
      merged.end_date,
      merged.description,
      merged.target,
      merged.weekly_amount,
      merged.data,
      params.id,
    ]
  );
  return NextResponse.json({ trip: mapRow(rows[0]) });
}

export async function DELETE(req, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  await query("DELETE FROM trips WHERE id = $1", [params.id]);
  return NextResponse.json({ ok: true });
}
