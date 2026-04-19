import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools, chemistryReadings } from "@/backend/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(pools)
      .where(eq(pools.companyId, parseInt(companyId)))
      .orderBy(desc(pools.createdAt));

    return NextResponse.json({ pools: rows });
  } catch (err: any) {
    console.error("[api/pools GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyId, name, clientName, clientEmail, clientPhone,
      address, lat, lng, type, volumeGallons, notes,
      monthlyRate, serviceDay,
    } = body;

    if (!companyId || !name || !clientName || !address) {
      return NextResponse.json(
        { error: "companyId, name, clientName, and address are required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(pools)
      .values({
        companyId: parseInt(companyId),
        name,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        address,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        type: type || "residential",
        volumeGallons: volumeGallons ? parseInt(volumeGallons) : null,
        notes: notes || null,
        monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
        serviceDay: serviceDay || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({ pool: inserted }, { status: 201 });
  } catch (err: any) {
    console.error("[api/pools POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
