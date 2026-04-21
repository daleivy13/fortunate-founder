import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { employees, users } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const companyId = parseInt(searchParams.get("companyId") ?? "");
    if (!companyId || isNaN(companyId)) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const rows = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, companyId))
      .orderBy(desc(employees.createdAt));

    return NextResponse.json({ employees: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { companyId, name, email, phone, role, hourlyRate } = body;

    const [emp] = await db
      .insert(employees)
      .values({
        companyId: parseInt(companyId),
        name,
        email: email || null,
        phone: phone || null,
        role: role || "technician",
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ employee: emp }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
