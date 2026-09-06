import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomUUID } from "crypto";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { rows } = await query("SELECT * FROM trips ORDER BY created_at ASC");
  return NextResponse.json({ trips: rows.map(mapRow) });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Trip name is required." }, { status: 400 });
  }
  const id = randomUUID();
  const emptyData = { members: [], contributions: [], expenses: [], budgets: {} };
  const { rows } = await query(
    `INSERT INTO trips (id, name, destination, start_date, end_date, description, target, weekly_amount, data, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      body.name.trim(),
      body.destination || "",
      body.startDate || null,
      body.endDate || null,
      body.description || "",
      Number(body.target) || 0,
      Number(body.weeklyAmount) || 0,
      emptyData,
      user.id,
    ]
  );
  return NextResponse.json({ trip: mapRow(rows[0]) });
}
