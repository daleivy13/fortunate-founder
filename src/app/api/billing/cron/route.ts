import { NextRequest, NextResponse } from "next/server";

// Vercel Cron setup (add to vercel.json):
// {
//   "crons": [{ "path": "/api/billing/cron", "schedule": "0 9 * * *" }]
// }
// Set CRON_SECRET in environment variables and add it to the cron request header:
// x-cron-secret: <your-secret>

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/billing/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "run" }),
  });

  const result = await res.json();

  return NextResponse.json({
    success: true,
    date: new Date().toISOString(),
    billedCount: result.billedCount ?? 0,
    billed: result.billed ?? [],
    failed: result.failed ?? [],
  });
}
