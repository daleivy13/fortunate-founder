import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

function scoreGrade(margin: number): { grade: "A"|"B"|"C"|"D"|"F"; color: string } {
  if (margin >= 60) return { grade: "A", color: "emerald" };
  if (margin >= 40) return { grade: "B", color: "blue"    };
  if (margin >= 20) return { grade: "C", color: "amber"   };
  if (margin >= 0)  return { grade: "D", color: "orange"  };
  return               { grade: "F", color: "red"     };
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const poolRows = await db.execute(sql`
    SELECT p.*,
      COUNT(DISTINCT sr.id) AS report_count,
      COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) AS total_earned
    FROM pools p
    LEFT JOIN service_reports sr ON sr.pool_id = p.id
    LEFT JOIN invoices i ON i.pool_id = p.id
    WHERE p.company_id = ${parseInt(companyId)}
      AND p.is_active = true
    GROUP BY p.id
    ORDER BY p.name
  `);

  const results = poolRows.rows.map((pool: any) => {
    const monthlyRevenue     = parseFloat(pool.monthly_rate ?? 0);
    const reportCount        = parseInt(pool.report_count ?? 0);
    const reportsPerMonth    = reportCount > 0 ? Math.min(reportCount, 4) : 4;

    // Estimated costs
    const monthlyChemCost    = reportsPerMonth * 30;         // $30/visit baseline
    const monthlyTimeCost    = reportsPerMonth * 15;         // 45min @ $20/hr = $15/visit
    const monthlyDriveCost   = reportsPerMonth * 5;          // $5/visit rough estimate

    const totalCost = monthlyChemCost + monthlyTimeCost + monthlyDriveCost;
    const profit    = monthlyRevenue - totalCost;
    const margin    = monthlyRevenue > 0 ? Math.round((profit / monthlyRevenue) * 100) : -100;
    const { grade, color } = scoreGrade(margin);

    return {
      id:           pool.id,
      name:         pool.name,
      clientName:   pool.client_name,
      clientEmail:  pool.client_email,
      address:      pool.address,
      monthlyRate:  monthlyRevenue,
      monthlyRevenue,
      monthlyChemCost,
      monthlyTimeCost,
      monthlyDriveCost,
      totalCost,
      profit,
      margin,
      grade,
      color,
      reportsPerMonth,
    };
  });

  // Sort worst first
  results.sort((a, b) => a.margin - b.margin);

  const atRisk = results.filter(r => r.grade === "D" || r.grade === "F").length;

  return NextResponse.json({ pools: results, atRisk });
}
