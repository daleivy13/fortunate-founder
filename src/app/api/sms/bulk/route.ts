import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { pools } from "@/backend/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const BulkSMSSchema = z.object({
  companyId: z.number().int().positive(),
  message:   z.string().min(1).max(160),
  segment:   z.enum(["all","residential","commercial","hoa"]).default("all"),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(BulkSMSSchema, await req.json());
  if (ve) return ve;

  const allPools = await db.select().from(pools)
    .where(and(
      eq(pools.companyId, data.companyId),
      eq(pools.isActive, true),
      isNotNull(pools.clientPhone),
    ));

  const targets = data.segment === "all"
    ? allPools
    : allPools.filter(p => p.type === data.segment);

  if (targets.length === 0) {
    return NextResponse.json({ error: "No pools with phone numbers in that segment" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  const results: { name: string; phone: string; sent: boolean }[] = [];

  for (const pool of targets) {
    if (!pool.clientPhone) continue;

    let sent = false;
    if (accountSid && authToken && from) {
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: pool.clientPhone, From: from, Body: data.message }).toString(),
          }
        );
        sent = res.ok;
      } catch {}
    } else {
      // Dev mode — simulate send
      console.log(`[bulk-sms] Would send to ${pool.clientName} (${pool.clientPhone}): ${data.message}`);
      sent = true;
    }

    results.push({ name: pool.clientName, phone: pool.clientPhone, sent });
  }

  const sentCount = results.filter(r => r.sent).length;
  return NextResponse.json({ sent: sentCount, total: results.length, results });
}
