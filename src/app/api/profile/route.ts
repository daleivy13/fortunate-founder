import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { users, companies } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const { uid, displayName, phone, companyName } = await req.json();
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

    // Update user record
    await db
      .update(users)
      .set({
        name:  displayName || null,
        phone: phone       || null,
      })
      .where(eq(users.firebaseUid, uid));

    // Update company name if provided
    if (companyName) {
      const [user] = await db.select().from(users).where(eq(users.firebaseUid, uid));
      if (user?.companyId) {
        await db
          .update(companies)
          .set({ name: companyName })
          .where(eq(companies.id, user.companyId));
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[api/profile PATCH]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
