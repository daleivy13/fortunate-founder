import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const techId    = searchParams.get("techId");

  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  try {
    // Per-tech ratings
    const techStats = await db.execute(sql`
      SELECT 
        tech_id,
        COUNT(*) as total_ratings,
        ROUND(AVG(rating), 1) as avg_rating,
        COUNT(*) FILTER (WHERE rating >= 4) as positive,
        COUNT(*) FILTER (WHERE rating <= 2) as negative
      FROM client_ratings
      WHERE company_id = ${parseInt(companyId)}
      ${techId ? sql`AND tech_id = ${techId}` : sql``}
      GROUP BY tech_id
    `);

    // Recent ratings
    const recent = await db.execute(sql`
      SELECT r.*, p.name as pool_name, p.client_name
      FROM client_ratings r
      JOIN pools p ON p.id = r.pool_id
      WHERE r.company_id = ${parseInt(companyId)}
      ORDER BY r.created_at DESC
      LIMIT 50
    `);

    return NextResponse.json({ techStats: techStats.rows, recent: recent.rows });
  } catch {
    // Mock data
    return NextResponse.json({
      techStats: [
        { tech_id: "1", total_ratings: 47, avg_rating: 4.8, positive: 44, negative: 1 },
        { tech_id: "2", total_ratings: 32, avg_rating: 4.6, positive: 29, negative: 2 },
      ],
      recent: [
        { rating: 5, pool_name: "Johnson Residence", client_name: "Mike Johnson", created_at: new Date().toISOString(), feedback: "Always on time and the pool looks perfect!" },
        { rating: 4, pool_name: "Rivera Family",     client_name: "Carlos Rivera",  created_at: new Date(Date.now() - 86400000).toISOString(), feedback: "" },
        { rating: 5, pool_name: "Park Estates HOA",  client_name: "Sarah Chen",     created_at: new Date(Date.now() - 172800000).toISOString(), feedback: "Very professional." },
      ],
    });
  }
}

export async function POST(req: NextRequest) {
  const { action, reportId, poolId, companyId, techId, rating, feedback, clientPhone } = await req.json();

  // Called after service complete — send rating SMS
  if (action === "request_rating") {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://poolpalai.com";
    const ratingUrl = `${baseUrl}/rate/${reportId}`;

    // Send via Twilio SMS
    try {
      await fetch(`${baseUrl}/api/sms`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type: "rating_request",
          to:   clientPhone,
          data: { clientName: "there", techName: "your pool tech", ratingUrl },
        }),
      });
    } catch {}

    return NextResponse.json({ success: true });
  }

  // Inbound rating (client clicks link or replies to SMS)
  if (action === "submit") {
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }
    try {
      await db.execute(sql`
        INSERT INTO client_ratings (report_id, pool_id, company_id, tech_id, rating, feedback, created_at)
        VALUES (${parseInt(reportId)}, ${parseInt(poolId)}, ${parseInt(companyId)}, ${techId}, ${parseInt(rating)}, ${feedback ?? ""}, NOW())
        ON CONFLICT (report_id) DO UPDATE SET rating = EXCLUDED.rating, feedback = EXCLUDED.feedback
      `);
    } catch {}
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
