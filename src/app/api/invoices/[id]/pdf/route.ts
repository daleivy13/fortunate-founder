import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });

  const invRows  = await db.execute(sql`SELECT * FROM invoices WHERE id = ${id} LIMIT 1`);
  const invoice  = invRows.rows[0] as any;
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const compRows = await db.execute(sql`SELECT * FROM companies WHERE id = ${invoice.company_id} LIMIT 1`);
  const company  = (compRows.rows[0] as any) ?? {};

  let pool: any = null;
  if (invoice.pool_id) {
    const poolRows = await db.execute(sql`SELECT * FROM pools WHERE id = ${invoice.pool_id} LIMIT 1`);
    pool = (poolRows.rows[0] as any) ?? null;
  }

  const props = {
    invoice: {
      id:          invoice.id,
      clientName:  invoice.client_name,
      clientEmail: invoice.client_email,
      amount:      parseFloat(invoice.amount ?? 0),
      status:      invoice.status,
      dueDate:     invoice.due_date,
      lineItems:   invoice.line_items ?? "[]",
      notes:       invoice.notes,
      createdAt:   invoice.created_at,
      sentAt:      invoice.sent_at,
    },
    company: {
      name:    company.name ?? "Pool Service",
      address: company.address,
      phone:   company.phone,
      logoUrl: company.logo_url,
    },
    pool: pool ? { address: pool.address } : undefined,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const el = React.createElement(InvoicePDF as any, props) as any;
  const pdfBuffer = await renderToBuffer(el);
  const invoiceNum = `INV-${String(invoice.id).padStart(4, "0")}`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNum}.pdf"`,
    },
  });
}
