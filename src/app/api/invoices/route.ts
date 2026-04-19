import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { invoices } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.companyId, parseInt(companyId)))
      .orderBy(desc(invoices.createdAt));

    return NextResponse.json({ invoices: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, poolId, clientName, clientEmail, lineItems, dueDate, notes } = body;

    const total = (JSON.parse(lineItems) as { qty: number; rate: number }[])
      .reduce((s, i) => s + i.qty * i.rate, 0);

    const [inv] = await db
      .insert(invoices)
      .values({
        companyId: parseInt(companyId),
        poolId: poolId ? parseInt(poolId) : null,
        clientName,
        clientEmail: clientEmail || null,
        amount: total,
        status: "draft",
        dueDate: dueDate || null,
        lineItems,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ invoice: inv }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
