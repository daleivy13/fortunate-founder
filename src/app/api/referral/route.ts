import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

const REFERRAL_CREDIT_USD = 50; // $50 credit per successful referral

export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    // Get referral stats
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
        COUNT(*) FILTER (WHERE status = 'paid')      AS paid,
        COUNT(*) FILTER (WHERE status = 'paid') * ${REFERRAL_CREDIT_USD} AS total_credit
      FROM referrals WHERE referrer_id = ${userId}
    `);

    const referrals = await db.execute(sql`
      SELECT referee_email, status, created_at, paid_at
      FROM referrals WHERE referrer_id = ${userId}
      ORDER BY created_at DESC LIMIT 50
    `);

    const referralCode = generateCode(userId);

    return NextResponse.json({
      referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?ref=${referralCode}`,
      stats:        stats.rows[0] ?? { pending: 0, paid: 0, total_credit: 0 },
      referrals:    referrals.rows,
    });
  } catch {
    // Table may not exist yet
    const referralCode = generateCode(userId);
    return NextResponse.json({
      referralCode,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?ref=${referralCode}`,
      stats:        { pending: 0, paid: 0, total_credit: 0 },
      referrals:    [],
    });
  }
}

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { action, referrerId, refereeEmail, refereeId } = await req.json();

  if (action === "track") {
    // Someone signed up with a referral code
    try {
      await db.execute(sql`
        INSERT INTO referrals (referrer_id, referee_email, status, created_at)
        VALUES (${referrerId}, ${refereeEmail}, 'pending', NOW())
        ON CONFLICT (referrer_id, referee_email) DO NOTHING
      `);
    } catch {}
    return NextResponse.json({ success: true });
  }

  if (action === "convert") {
    // Referree made their first payment — award credit
    try {
      await db.execute(sql`
        UPDATE referrals SET status = 'paid', paid_at = NOW()
        WHERE referee_email = ${refereeEmail} AND status = 'pending'
      `);
      // Apply credit to referrer's account (stored as negative invoice amount)
      await db.execute(sql`
        INSERT INTO referral_credits (user_id, amount_usd, reason, created_at)
        VALUES (${referrerId}, ${REFERRAL_CREDIT_USD}, 'Referral: ' || ${refereeEmail}, NOW())
      `);
    } catch {}
    return NextResponse.json({ success: true, creditAwarded: REFERRAL_CREDIT_USD });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function generateCode(userId: string): string {
  // Deterministic short code from userId — same code every time for same user
  const hash = userId.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
}
