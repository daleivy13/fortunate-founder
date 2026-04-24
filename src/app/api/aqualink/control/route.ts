import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { aqualinkConnections } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const AQUALINK_BASE = "https://prod.iaquadigital.com/api/v1";

const ControlSchema = z.object({
  poolId:    z.number().int().positive(),
  deviceId:  z.string(),
  state:     z.boolean(),
  // For heater/pump speed: optional numeric value (0–100 for pump %, °F for heater)
  value:     z.number().optional(),
});

export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(ControlSchema, await req.json());
  if (ve) return ve;

  const [conn] = await db.select().from(aqualinkConnections)
    .where(eq(aqualinkConnections.poolId, data.poolId));

  if (!conn?.sessionToken || !conn?.systemId) {
    return NextResponse.json({ error: "AquaLink not connected for this pool" }, { status: 404 });
  }

  try {
    const body: Record<string, any> = { command: data.state ? "on" : "off" };
    if (data.value !== undefined) body.value = data.value;

    const res = await fetch(
      `${AQUALINK_BASE}/systems/${conn.systemId}/devices/${data.deviceId}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${conn.sessionToken}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ error: `AquaLink error: ${errBody}` }, { status: res.status });
    }

    const result = await res.json();
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Control command failed" }, { status: 500 });
  }
}
