import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { companyId, dryRun } = await req.json();
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  // Tomorrow's day name
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = DAYS[tomorrow.getDay()];
  const tomorrowLabel = tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Get all active pools for this company with tomorrow's service day and a client phone
  const pools = await db.execute(sql`
    SELECT id, name, client_name, client_phone, address
    FROM pools
    WHERE company_id = ${parseInt(companyId)}
      AND service_day = ${tomorrowDay}
      AND client_phone IS NOT NULL
      AND client_phone != ''
      AND status = 'active'
  `);

  if ((pools.rows as any[]).length === 0) {
    return NextResponse.json({ sent: 0, total: 0, day: tomorrowLabel, message: "No pools scheduled for tomorrow with phone numbers" });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;
  const canSend    = !!(accountSid && authToken && from) && !dryRun;

  let sent = 0;
  const results: any[] = [];

  for (const pool of pools.rows as any[]) {
    const message = `Hi ${pool.client_name?.split(" ")[0] ?? "there"}! Reminder: your pool service is scheduled for tomorrow, ${tomorrowLabel}. Reply STOP to opt out.`;

    if (!canSend) {
      results.push({ pool: pool.name, phone: pool.client_phone, status: dryRun ? "preview" : "skipped (Twilio not configured)" });
      sent++;
      continue;
    }

    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method:  "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: pool.client_phone, From: from!, Body: message }).toString(),
        }
      );
      if (res.ok) {
        sent++;
        results.push({ pool: pool.name, phone: pool.client_phone, status: "sent" });
      } else {
        results.push({ pool: pool.name, phone: pool.client_phone, status: "failed" });
      }
    } catch {
      results.push({ pool: pool.name, phone: pool.client_phone, status: "failed" });
    }
  }

  return NextResponse.json({ sent, total: pools.rows.length, day: tomorrowLabel, results });
}
