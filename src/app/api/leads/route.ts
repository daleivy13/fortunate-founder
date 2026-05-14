import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/backend/db";
import { serviceLeads, leadPurchases, companies } from "@/backend/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  contactName:  z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  zipCode:      z.string().min(5),
  city:         z.string().optional(),
  state:        z.string().optional(),
  serviceNeeds: z.array(z.string()).min(1),
  poolVolume:   z.number().int().positive().optional(),
  poolType:     z.string().optional(),
  budget:       z.string().optional(),
  notes:        z.string().optional(),
  poolId:       z.number().int().positive().optional(),
});

// ── GET: pros fetch open leads; homeowners fetch their own ────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const homeowner = searchParams.get("homeowner") === "true";

  if (homeowner) {
    // Homeowner fetching their own submitted leads
    const userId = auth.uid;
    const rows = await db
      .select()
      .from(serviceLeads)
      .where(eq(serviceLeads.homeownerId, userId))
      .orderBy(serviceLeads.createdAt);
    return NextResponse.json({ leads: rows });
  }

  // Pro fetching open marketplace leads (contact info redacted)
  const allLeads = await db
    .select()
    .from(serviceLeads)
    .where(eq(serviceLeads.status, "open"))
    .orderBy(serviceLeads.createdAt);

  // Find which leads this company has already unlocked
  let unlockedIds: Set<number> = new Set();
  if (companyId) {
    const purchases = await db
      .select({ leadId: leadPurchases.leadId })
      .from(leadPurchases)
      .where(eq(leadPurchases.proCompanyId, parseInt(companyId)));
    purchases.forEach((p) => unlockedIds.add(p.leadId));
  }

  const redacted = allLeads.map((lead) => {
    const unlocked = unlockedIds.has(lead.id);
    return {
      id:           lead.id,
      city:         lead.city,
      state:        lead.state,
      zipCode:      lead.zipCode,
      serviceNeeds: JSON.parse(lead.serviceNeeds),
      poolVolume:   lead.poolVolume,
      poolType:     lead.poolType,
      budget:       lead.budget,
      notes:        unlocked ? lead.notes : null,
      createdAt:    lead.createdAt,
      unlocked,
      // Only expose contact if unlocked
      contactName:  unlocked ? lead.contactName  : null,
      contactEmail: unlocked ? lead.contactEmail : null,
      contactPhone: unlocked ? lead.contactPhone : null,
    };
  });

  return NextResponse.json({ leads: redacted });
}

// ── POST: homeowner submits a new lead ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const parsed = SubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  const [lead] = await db.insert(serviceLeads).values({
    homeownerId:  auth.uid,
    poolId:       d.poolId,
    zipCode:      d.zipCode,
    city:         d.city,
    state:        d.state,
    serviceNeeds: JSON.stringify(d.serviceNeeds),
    poolVolume:   d.poolVolume,
    poolType:     d.poolType,
    budget:       d.budget,
    notes:        d.notes,
    status:       "open",
    contactName:  d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
  }).returning();

  return NextResponse.json({ lead }, { status: 201 });
}
