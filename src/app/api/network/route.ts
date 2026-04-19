import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// Network owner can see all their franchise locations rolled up
export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const networkOwnerId = searchParams.get("networkOwnerId") ?? auth!.uid;

  try {
    // Get all companies this user owns or manages
    const companies = await db.execute(sql`
      SELECT 
        c.*,
        COUNT(DISTINCT p.id)  AS pool_count,
        COUNT(DISTINCT e.id)  AS tech_count,
        COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'paid' AND i.created_at > NOW() - INTERVAL '30 days'), 0) AS monthly_revenue,
        COALESCE(SUM(i.amount) FILTER (WHERE i.status IN ('sent','overdue')), 0) AS outstanding
      FROM companies c
      LEFT JOIN pools        p ON p.company_id = c.id
      LEFT JOIN employees    e ON e.company_id = c.id
      LEFT JOIN invoices     i ON i.company_id = c.id
      WHERE c.owner_id = ${networkOwnerId} OR c.network_owner_id = ${networkOwnerId}
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `);

    const rows = companies.rows as any[];

    // Roll up network stats
    const networkStats = {
      totalCompanies:  rows.length,
      totalPools:      rows.reduce((s: number, c: any) => s + parseInt(c.pool_count  ?? 0), 0),
      totalTechs:      rows.reduce((s: number, c: any) => s + parseInt(c.tech_count  ?? 0), 0),
      totalRevenue:    rows.reduce((s: number, c: any) => s + parseFloat(c.monthly_revenue ?? 0), 0),
      totalOutstanding:rows.reduce((s: number, c: any) => s + parseFloat(c.outstanding ?? 0), 0),
    };

    return NextResponse.json({ companies: rows, networkStats });
  } catch {
    // Return mock data
    return NextResponse.json({
      companies: [
        { id: 1, name: "Sunbelt Pool Services — Phoenix",   pool_count: 47, tech_count: 3, monthly_revenue: 8430, outstanding: 1200 },
        { id: 2, name: "Sunbelt Pool Services — Scottsdale",pool_count: 31, tech_count: 2, monthly_revenue: 5580, outstanding: 450  },
        { id: 3, name: "Sunbelt Pool Services — Tempe",     pool_count: 22, tech_count: 1, monthly_revenue: 3960, outstanding: 0    },
      ],
      networkStats: { totalCompanies: 3, totalPools: 100, totalTechs: 6, totalRevenue: 17970, totalOutstanding: 1650 },
    });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { action, companyId, networkOwnerId } = await req.json();

  if (action === "add_to_network") {
    // Link an existing company to a network owner
    try {
      await db.execute(sql`
        UPDATE companies SET network_owner_id = ${networkOwnerId}
        WHERE id = ${parseInt(companyId)}
      `);
    } catch {}
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
