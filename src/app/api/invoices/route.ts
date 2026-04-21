import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { invoices } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { validateBody, CreateInvoiceSchema } from "@/lib/validation";
import { cacheDel, CacheKeys } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = parseInt(searchParams.get("companyId") ?? "");
  if (!companyId || isNaN(companyId)) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  try {
    const rows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.createdAt));
    return NextResponse.json({ invoices: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { data, error: valErr } = validateBody(CreateInvoiceSchema, body);
  if (valErr) return valErr;

  try {
    const lineItemsStr = typeof data.lineItems === "string"
      ? data.lineItems
      : JSON.stringify(data.lineItems);

    const parsed = JSON.parse(lineItemsStr) as { qty: number; rate: number }[];
    const total  = parsed.reduce((s, i) => s + i.qty * i.rate, 0);

    const [inv] = await db
      .insert(invoices)
      .values({
        companyId:   data.companyId,
        poolId:      data.poolId ?? null,
        clientName:  data.clientName,
        clientEmail: data.clientEmail || null,
        amount:      total,
        status:      "draft",
        dueDate:     data.dueDate || null,
        lineItems:   lineItemsStr,
        notes:       data.notes || null,
      })
      .returning();

    await cacheDel(CacheKeys.invoices(data.companyId));
    return NextResponse.json({ invoice: inv }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
