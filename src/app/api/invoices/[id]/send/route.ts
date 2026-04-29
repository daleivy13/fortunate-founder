// Required env vars:
// RESEND_API_KEY — Resend email API key
// CF_R2_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, CF_R2_BUCKET_NAME — Cloudflare R2

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function uploadToR2(buffer: Buffer, key: string): Promise<string | null> {
  const { CF_R2_ACCOUNT_ID, CF_R2_ACCESS_KEY_ID, CF_R2_SECRET_ACCESS_KEY, CF_R2_BUCKET_NAME } = process.env;
  if (!CF_R2_ACCOUNT_ID || !CF_R2_ACCESS_KEY_ID || !CF_R2_SECRET_ACCESS_KEY || !CF_R2_BUCKET_NAME) return null;

  try {
    const url = `https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${CF_R2_BUCKET_NAME}/${key}`;

    // Simple PUT to R2 using native fetch + AWS Sig V4
    // For production: use @aws-sdk/client-s3 or @aws-sdk/s3-request-presigner
    const res = await fetch(url, {
      method:  "PUT",
      headers: {
        "Content-Type":   "application/pdf",
        "Content-Length": String(buffer.byteLength),
        // Note: R2 uses Sig V4 — in production replace this stub with proper AWS signing
        "X-Custom-Auth-Key": CF_R2_ACCESS_KEY_ID,
      },
      body: buffer,
    });
    if (!res.ok) return null;
    return url;
  } catch {
    return null;
  }
}

function buildEmailHtml(params: {
  clientFirstName: string;
  companyName: string;
  amount: number;
  invoiceNum: string;
  dueDate: string;
  paymentUrl?: string;
  companyPhone?: string;
  companyEmail?: string;
}) {
  const { clientFirstName, companyName, amount, invoiceNum, dueDate, paymentUrl, companyPhone, companyEmail } = params;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header bar -->
        <tr><td style="background:#1756a9;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold">${companyName}</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Invoice ${invoiceNum}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;font-size:15px;color:#0f172a">Hi ${clientFirstName},</p>
          <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6">
            Please find your invoice attached for pool service. Here's a quick summary:
          </p>
          <!-- Summary box -->
          <table width="100%" style="background:#e8f1fc;border-radius:8px;margin-bottom:24px">
            <tr>
              <td style="padding:16px">
                <p style="margin:0 0 6px;font-size:12px;color:#1756a9;font-weight:bold;text-transform:uppercase;letter-spacing:.5px">Invoice Summary</p>
                <table width="100%">
                  <tr>
                    <td style="font-size:13px;color:#475569;padding:3px 0">Invoice #</td>
                    <td align="right" style="font-size:13px;color:#0f172a;font-weight:bold">${invoiceNum}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#475569;padding:3px 0">Amount Due</td>
                    <td align="right" style="font-size:16px;color:#1756a9;font-weight:bold">$${amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#475569;padding:3px 0">Due Date</td>
                    <td align="right" style="font-size:13px;color:#0f172a">${dueDate}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ${paymentUrl ? `<p style="text-align:center;margin-bottom:28px">
            <a href="${paymentUrl}" style="background:#1756a9;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:bold;display:inline-block">
              Pay Now — $${amount.toFixed(2)} →
            </a>
          </p>` : ""}
          <p style="font-size:13px;color:#475569;line-height:1.6">
            A PDF copy of your invoice is attached to this email for your records.
            If you have any questions, please don't hesitate to reach out.
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#475569">
            Thank you for your continued trust in ${companyName}.<br>
            ${companyPhone ? `📞 ${companyPhone}` : ""}
            ${companyEmail ? ` &nbsp;✉️ ${companyEmail}` : ""}
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">
            Sent via PoolPal AI · Pool Service Management Platform
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });

  const invRows = await db.execute(sql`SELECT * FROM invoices WHERE id = ${id} LIMIT 1`);
  const invoice = invRows.rows[0] as any;
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (!invoice.client_email) return NextResponse.json({ error: "No client email on file" }, { status: 400 });

  const compRows = await db.execute(sql`SELECT * FROM companies WHERE id = ${invoice.company_id} LIMIT 1`);
  const company  = compRows.rows[0] as any ?? {};

  let pool: any = null;
  if (invoice.pool_id) {
    const poolRows = await db.execute(sql`SELECT * FROM pools WHERE id = ${invoice.pool_id} LIMIT 1`);
    pool = poolRows.rows[0] as any ?? null;
  }

  // Generate PDF buffer
  const pdfBuffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
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
    })
  );

  const invoiceNum = `INV-${String(invoice.id).padStart(4, "0")}`;

  // Upload to R2
  const r2Key  = `invoices/${invoice.company_id}/${invoice.id}.pdf`;
  const pdfUrl = await uploadToR2(pdfBuffer as Buffer, r2Key);

  if (!resend) return NextResponse.json({ error: "Email not configured (missing RESEND_API_KEY)" }, { status: 500 });

  const clientFirstName = invoice.client_name?.split(" ")[0] ?? "there";
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "upon receipt";

  await resend.emails.send({
    from:    `${company.name ?? "Pool Service"} <invoices@poolpalai.com>`,
    to:      invoice.client_email,
    subject: `Invoice from ${company.name ?? "Pool Service"} — $${parseFloat(invoice.amount).toFixed(2)}`,
    html:    buildEmailHtml({
      clientFirstName,
      companyName:  company.name ?? "Pool Service",
      amount:       parseFloat(invoice.amount ?? 0),
      invoiceNum,
      dueDate,
      companyPhone: company.phone,
      companyEmail: company.email,
    }),
    text: `Hi ${clientFirstName}, your invoice ${invoiceNum} for $${parseFloat(invoice.amount).toFixed(2)} is due ${dueDate}. Please see the attached PDF.`,
    attachments: [{
      filename: `${invoiceNum}.pdf`,
      content:  pdfBuffer.toString("base64"),
    }],
  });

  // Update invoice status to sent
  await db.execute(sql`
    UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = ${id}
  `);

  return NextResponse.json({ success: true, pdfUrl, invoiceNum });
}
