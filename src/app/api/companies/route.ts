import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { companies, users } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { companyName, phone, address, ownerId, email, plan } = body;

    // Create company
    const [company] = await db
      .insert(companies)
      .values({
        name: companyName,
        ownerId,
        phone: phone || null,
        address: address || null,
        plan: plan ?? "starter",
        subscriptionStatus: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning();

    // Upsert user record
    await db
      .insert(users)
      .values({
        id: ownerId,
        email,
        firebaseUid: ownerId,
        companyId: company.id,
        role: "owner",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { companyId: company.id },
      });

    return NextResponse.json({ company }, { status: 201 });
  } catch (err: any) {
    console.error("[api/companies POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("ownerId");
    if (!ownerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, ownerId));

    return NextResponse.json({ company: company ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
