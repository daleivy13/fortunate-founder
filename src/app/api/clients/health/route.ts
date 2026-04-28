import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

function gradeFromScore(score: number): { grade: "A"|"B"|"C"|"D"|"F"; color: string } {
  if (score >= 85) return { grade: "A", color: "emerald" };
  if (score >= 70) return { grade: "B", color: "blue"    };
  if (score >= 55) return { grade: "C", color: "amber"   };
  if (score >= 40) return { grade: "D", color: "orange"  };
  return               { grade: "F", color: "red"     };
}

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const cid = parseInt(companyId);

  const poolRows = await db.execute(sql`
    SELECT
      p.id, p.name, p.client_name, p.client_email, p.created_at AS pool_created_at,
      COUNT(DISTINCT sr.id) AS report_count,
      COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) AS overdue_invoices,
      COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) AS paid_invoices,
      AVG(cr.rating) AS avg_rating,
      COUNT(DISTINCT cr.id) AS rating_count,
      COUNT(DISTINCT CASE WHEN sr.issues_found IS NOT NULL AND sr.issues_found != '' THEN sr.id END) AS issues_count
    FROM pools p
    LEFT JOIN service_reports sr ON sr.pool_id = p.id
    LEFT JOIN invoices i ON i.pool_id = p.id
    LEFT JOIN client_ratings cr ON cr.pool_id = p.id
    WHERE p.company_id = ${cid} AND p.is_active = true
    GROUP BY p.id
    ORDER BY p.name
  `);

  const results = poolRows.rows.map((pool: any) => {
    const now = Date.now();
    const createdAt = new Date(pool.pool_created_at).getTime();
    const ageMonths = Math.floor((now - createdAt) / (30 * 24 * 3600 * 1000));

    const overdueInvoices = parseInt(pool.overdue_invoices ?? 0);
    const paidInvoices    = parseInt(pool.paid_invoices ?? 0);
    const totalInvoices   = overdueInvoices + paidInvoices;
    const issuesCount     = parseInt(pool.issues_count ?? 0);
    const reportCount     = parseInt(pool.report_count ?? 0);
    const avgRating       = parseFloat(pool.avg_rating ?? 0);
    const ratingCount     = parseInt(pool.rating_count ?? 0);

    // Payment history: 30 pts
    let paymentPts = 30;
    if (overdueInvoices > 0 && totalInvoices > 0) {
      const overdueRatio = overdueInvoices / totalInvoices;
      if (overdueRatio > 0.3) paymentPts = 0;
      else if (overdueRatio > 0.1) paymentPts = 15;
    }

    // Pool chemistry: 25 pts
    let chemPts = 25;
    if (reportCount > 0) {
      const issueRatio = issuesCount / reportCount;
      if (issueRatio > 0.5) chemPts = 0;
      else if (issueRatio > 0.2) chemPts = 12;
    }

    // Service history (no cancellations tracked yet, assume good): 20 pts
    const servicePts = 20;

    // Longevity: 15 pts
    let longevityPts = 0;
    if (ageMonths >= 24) longevityPts = 15;
    else if (ageMonths >= 12) longevityPts = 10;
    else if (ageMonths >= 6) longevityPts = 5;

    // Ratings: 10 pts
    let ratingPts = ratingCount > 0 ? Math.round(Math.min(avgRating * 2, 10)) : 5;

    const totalScore = paymentPts + chemPts + servicePts + longevityPts + ratingPts;
    const { grade, color } = gradeFromScore(totalScore);

    const flags: string[] = [];
    if (overdueInvoices > 0) flags.push(`${overdueInvoices} overdue invoice${overdueInvoices !== 1 ? "s" : ""}`);
    if (issuesCount > reportCount * 0.3 && reportCount > 0) flags.push("Frequent chemistry issues");
    if (ratingCount > 0 && avgRating < 3) flags.push(`Low rating (${avgRating.toFixed(1)}/5)`);

    return {
      poolId:      pool.id,
      clientName:  pool.client_name,
      poolName:    pool.name,
      score:       totalScore,
      grade,
      color,
      flags,
      breakdown: {
        payment:   paymentPts,
        chemistry: chemPts,
        service:   servicePts,
        longevity: longevityPts,
        ratings:   ratingPts,
      },
    };
  });

  results.sort((a, b) => b.score - a.score);

  const avg = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 0;

  const { grade: avgGrade } = gradeFromScore(avg);

  return NextResponse.json({ clients: results, avg, avgGrade });
}
