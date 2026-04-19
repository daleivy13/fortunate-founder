import { NextRequest, NextResponse } from "next/server";

// Cloudflare R2 is S3-compatible with zero egress fees
// Get from: https://dash.cloudflare.com → R2 → Create bucket
// Add: CF_ACCOUNT_ID, CF_R2_ACCESS_KEY, CF_R2_SECRET_KEY, CF_R2_BUCKET_NAME to .env.local

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const reportId = formData.get("reportId") as string;
    const poolId   = formData.get("poolId") as string;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Validate
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large — max 10MB" }, { status: 400 });
    }
    const allowed = ["image/jpeg","image/png","image/webp","image/heic"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WebP, or HEIC images allowed" }, { status: 400 });
    }

    const accountId  = process.env.CF_ACCOUNT_ID;
    const accessKey  = process.env.CF_R2_ACCESS_KEY;
    const secretKey  = process.env.CF_R2_SECRET_KEY;
    const bucketName = process.env.CF_R2_BUCKET_NAME ?? "poolpal-reports";

    if (!accountId || !accessKey || !secretKey) {
      // Fallback: return a placeholder URL in dev
      console.warn("[upload] Cloudflare R2 not configured — add CF_* vars to .env.local");
      return NextResponse.json({
        url:     `https://placeholder.poolpalai.com/reports/${poolId ?? "0"}/${Date.now()}.jpg`,
        message: "Configure Cloudflare R2 for real photo storage",
      });
    }

    // Build the key
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const key = `reports/${poolId ?? "unknown"}/${reportId ?? Date.now()}/${Date.now()}.${ext}`;

    // Upload to R2 via S3-compatible API
    const bytes = await file.arrayBuffer();

    // Using native fetch to R2's S3-compatible endpoint
    // For production, use @aws-sdk/client-s3 with R2 endpoint
    const r2Url   = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
    const creds   = Buffer.from(`${accessKey}:${secretKey}`).toString("base64");

    const uploadRes = await fetch(r2Url, {
      method:  "PUT",
      headers: {
        "Content-Type":   file.type,
        "Content-Length": String(file.size),
        Authorization:    `Basic ${creds}`,
      },
      body: bytes,
    });

    if (!uploadRes.ok) {
      throw new Error(`R2 upload failed: ${uploadRes.status}`);
    }

    // Public URL (set bucket as public in R2 dashboard)
    const publicUrl = `https://${bucketName}.${accountId}.r2.dev/${key}`;

    return NextResponse.json({ url: publicUrl, key });
  } catch (err: any) {
    console.error("[api/upload]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
