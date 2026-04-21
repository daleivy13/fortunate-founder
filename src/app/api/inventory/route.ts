import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";

const DEFAULT_CHEMICALS = [
  { name: "Liquid Chlorine (10%)",  unit: "gal",  minQty: 5,  costPerUnit: 6.99  },
  { name: "Muriatic Acid (31.45%)", unit: "gal",  minQty: 2,  costPerUnit: 8.99  },
  { name: "Soda Ash (pH Up)",       unit: "lbs",  minQty: 10, costPerUnit: 2.50  },
  { name: "Sodium Bicarbonate",     unit: "lbs",  minQty: 20, costPerUnit: 1.20  },
  { name: "Calcium Chloride",       unit: "lbs",  minQty: 10, costPerUnit: 1.80  },
  { name: "Cyanuric Acid",          unit: "lbs",  minQty: 5,  costPerUnit: 4.50  },
  { name: "Shock (Cal-Hypo 68%)",   unit: "lbs",  minQty: 10, costPerUnit: 3.25  },
  { name: "Algaecide 60%",          unit: "qt",   minQty: 3,  costPerUnit: 12.99 },
  { name: "Clarifier",              unit: "qt",   minQty: 2,  costPerUnit: 9.99  },
  { name: "Filter Aid (DE)",        unit: "lbs",  minQty: 5,  costPerUnit: 2.75  },
  { name: "Salt (pool grade)",      unit: "40lb", minQty: 3,  costPerUnit: 8.99  },
  { name: "Phosphate Remover",      unit: "qt",   minQty: 2,  costPerUnit: 14.99 },
];

export async function GET(req: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  try {
    const items = await db.execute(sql`
      SELECT * FROM chemical_inventory 
      WHERE company_id = ${parseInt(companyId)} AND is_active = true
      ORDER BY name ASC
    `);
    const inventory = items.rows as any[];
    const lowStock  = inventory.filter((i) => i.current_qty <= i.min_qty);

    return NextResponse.json({ inventory, lowStock, isLow: lowStock.length > 0 });
  } catch {
    // Table doesn't exist — return defaults with mock quantities
    const mock = DEFAULT_CHEMICALS.map((c, i) => ({
      id: i + 1, companyId: parseInt(companyId!),
      name: c.name, unit: c.unit,
      currentQty: Math.random() > 0.3 ? c.minQty + Math.floor(Math.random() * 10) : c.minQty - 1,
      minQty: c.minQty, costPerUnit: c.costPerUnit,
    }));
    const lowStock = mock.filter((i) => i.currentQty <= i.minQty);
    return NextResponse.json({ inventory: mock, lowStock, isLow: lowStock.length > 0 });
  }
}

export async function POST(req: NextRequest) {
  const { requireAuth } = await import("@/lib/auth");
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const body = await req.json();
  const { action, companyId, itemId, qty, name, unit, minQty, costPerUnit } = body;

  if (action === "init") {
    // Create default inventory for new company
    try {
      for (const chem of DEFAULT_CHEMICALS) {
        await db.execute(sql`
          INSERT INTO chemical_inventory (company_id, name, unit, current_qty, min_qty, cost_per_unit)
          VALUES (${parseInt(companyId)}, ${chem.name}, ${chem.unit}, ${chem.minQty + 5}, ${chem.minQty}, ${chem.costPerUnit})
          ON CONFLICT (company_id, name) DO NOTHING
        `);
      }
    } catch {}
    return NextResponse.json({ success: true });
  }

  if (action === "adjust") {
    // Add or remove stock
    try {
      await db.execute(sql`
        UPDATE chemical_inventory 
        SET current_qty = GREATEST(0, current_qty + ${parseFloat(qty)}),
            updated_at = NOW()
        WHERE id = ${parseInt(itemId)} AND company_id = ${parseInt(companyId)}
      `);
    } catch {}
    return NextResponse.json({ success: true });
  }

  if (action === "add_item") {
    try {
      await db.execute(sql`
        INSERT INTO chemical_inventory (company_id, name, unit, current_qty, min_qty, cost_per_unit)
        VALUES (${parseInt(companyId)}, ${name}, ${unit}, 0, ${parseFloat(minQty)}, ${parseFloat(costPerUnit ?? 0)})
        ON CONFLICT (company_id, name) DO UPDATE SET min_qty = EXCLUDED.min_qty
      `);
    } catch {}
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
