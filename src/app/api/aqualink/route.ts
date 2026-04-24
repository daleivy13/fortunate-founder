import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { aqualinkConnections } from "@/backend/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { validateBody } from "@/lib/validation";

const AQUALINK_BASE = "https://prod.iaquadigital.com/api/v1";

const ConnectSchema = z.object({
  poolId:   z.number().int().positive(),
  username: z.string().email(),
  password: z.string().min(1),
});

async function iAquaLogin(username: string, password: string) {
  const res = await fetch(`${AQUALINK_BASE}/users/sign_in`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ user: { email: username, password } }),
  });
  if (!res.ok) throw new Error("Invalid iAquaLink credentials");
  const data = await res.json();
  return {
    token:    data.authentication_token as string,
    userId:   data.id as string,
    systems:  data.systems as any[] ?? [],
  };
}

async function fetchDeviceStatus(token: string, systemId: string) {
  const res = await fetch(`${AQUALINK_BASE}/systems/${systemId}/status`, {
    headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

// GET — return connection + latest status for a pool
export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  const [conn] = await db.select().from(aqualinkConnections).where(eq(aqualinkConnections.poolId, poolId));
  if (!conn) return NextResponse.json({ connected: false });

  // Try to refresh status if token exists
  if (conn.sessionToken && conn.systemId) {
    try {
      const status = await fetchDeviceStatus(conn.sessionToken, conn.systemId);
      if (status) {
        const statusJson = JSON.stringify(status);
        await db.update(aqualinkConnections).set({ lastStatus: statusJson, lastSyncAt: new Date() })
          .where(eq(aqualinkConnections.id, conn.id));
        return NextResponse.json({ connected: true, systemName: conn.systemName, status });
      }
    } catch {}
  }

  const lastStatus = conn.lastStatus ? JSON.parse(conn.lastStatus) : null;
  return NextResponse.json({
    connected: true,
    systemName: conn.systemName,
    status:    lastStatus,
    lastSyncAt: conn.lastSyncAt,
  });
}

// POST — connect iAquaLink account to a pool
export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: ve } = await validateBody(ConnectSchema, await req.json());
  if (ve) return ve;

  try {
    const { token, systems } = await iAquaLogin(data.username, data.password);
    const system = systems[0]; // use first system by default

    const statusRaw = system ? await fetchDeviceStatus(token, String(system.id)) : null;

    await db.insert(aqualinkConnections).values({
      poolId:       data.poolId,
      username:     data.username,
      sessionToken: token,
      systemId:     system ? String(system.id) : null,
      systemName:   system?.name ?? "Pool System",
      lastStatus:   statusRaw ? JSON.stringify(statusRaw) : null,
      lastSyncAt:   new Date(),
    }).onConflictDoUpdate({
      target: aqualinkConnections.poolId,
      set: {
        username:     data.username,
        sessionToken: token,
        systemId:     system ? String(system.id) : null,
        systemName:   system?.name ?? "Pool System",
        lastStatus:   statusRaw ? JSON.stringify(statusRaw) : null,
        lastSyncAt:   new Date(),
        isActive:     true,
      },
    });

    return NextResponse.json({
      connected:  true,
      systemName: system?.name ?? "Pool System",
      status:     statusRaw,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Connection failed" }, { status: 400 });
  }
}

// DELETE — disconnect
export async function DELETE(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const poolId = parseInt(new URL(req.url).searchParams.get("poolId") ?? "");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  await db.update(aqualinkConnections).set({ isActive: false, sessionToken: null })
    .where(eq(aqualinkConnections.poolId, poolId));

  return NextResponse.json({ success: true });
}
