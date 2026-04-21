import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { companies } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ company });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const body = await req.json();
    const allowed = ["name", "phone", "address", "logoUrl", "timezone", "currency"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const [updated] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ company: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const [deleted] = await db.delete(companies).where(eq(companies.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
