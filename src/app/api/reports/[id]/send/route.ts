import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { serviceReports, pools } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

// Uses Resend for transactional email (free tier: 3k emails/mo)
// Install: npm install resend
// Get API key: https://resend.com

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const reportId = parseInt(params.id);

    const [report] = await db
      .select()
      .from(serviceReports)
      .where(eq(serviceReports.id, reportId));

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const [pool] = await db.select().from(pools).where(eq(pools.id, report.poolId));

    if (!pool?.clientEmail) {
      return NextResponse.json({ error: "Pool has no client email on file" }, { status: 400 });
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/reports/${reportId}/pdf`;

    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const fromDomain = process.env.RESEND_FROM_EMAIL ?? "reports@poolpalai.com";

      await resend.emails.send({
        from:    `PoolPal AI <${fromDomain}>`,
        to:      pool.clientEmail,
        subject: `Your Pool Service Report — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2 style="color:#0c4a6e">Pool Service Complete ✅</h2>
            <p>Hi ${pool.clientName ?? "there"},</p>
            <p>Your pool at <strong>${pool.address}</strong> has been serviced today.</p>
            <p>
              <a href="${pdfUrl}" style="background:#0ea5e9;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin:12px 0">
                View Service Report
              </a>
            </p>
            <p style="color:#64748b;font-size:13px">Thank you for your business!</p>
            <p style="color:#64748b;font-size:12px">Powered by PoolPal AI</p>
          </div>
        `,
      });
    } else {
      console.log(`[email] RESEND_API_KEY not set — would send report ${reportId} to ${pool.clientEmail}`);
    }

    // Mark report as sent
    await db
      .update(serviceReports)
      .set({ status: "sent", clientEmailedAt: new Date() })
      .where(eq(serviceReports.id, reportId));

    return NextResponse.json({
      success: true,
      message: `Report sent to ${pool.clientEmail}`,
      pdfUrl,
    });
  } catch (err: any) {
    console.error("[api/reports/[id]/send]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
