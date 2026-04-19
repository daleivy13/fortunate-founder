import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { serviceReports, pools, chemistryReadings, users } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

// Generates an HTML-based PDF-ready report
// In production, pipe this through Puppeteer or @react-pdf/renderer
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = parseInt(params.id);

    const [report] = await db
      .select()
      .from(serviceReports)
      .where(eq(serviceReports.id, reportId));

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const [pool] = await db.select().from(pools).where(eq(pools.id, report.poolId));

    let reading = null;
    if (report.chemReadingId) {
      const [r] = await db
        .select()
        .from(chemistryReadings)
        .where(eq(chemistryReadings.id, report.chemReadingId));
      reading = r;
    }

    const date = report.servicedAt
      ? new Date(report.servicedAt).toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
        });

    const checks = [
      { label: "Skimmed", done: report.skimmed },
      { label: "Brushed walls & floor", done: report.brushed },
      { label: "Vacuumed", done: report.vacuumed },
      { label: "Filter cleaned/inspected", done: report.filterCleaned },
      { label: "Chemicals added", done: report.chemicalsAdded },
      { label: "Equipment checked", done: report.equipmentChecked },
    ];

    const checkRows = checks
      .map(
        (c) => `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151">${c.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">
            <span style="font-size:16px">${c.done ? "✅" : "⬜"}</span>
          </td>
        </tr>`
      )
      .join("");

    const chemRows = reading
      ? [
          { label: "Free Chlorine", value: reading.freeChlorine, unit: "ppm", ok: reading.freeChlorine !== null && reading.freeChlorine >= 1 && reading.freeChlorine <= 4 },
          { label: "pH", value: reading.ph, unit: "", ok: reading.ph !== null && reading.ph >= 7.2 && reading.ph <= 7.6 },
          { label: "Total Alkalinity", value: reading.totalAlkalinity, unit: "ppm", ok: reading.totalAlkalinity !== null && reading.totalAlkalinity >= 80 && reading.totalAlkalinity <= 120 },
          { label: "Calcium Hardness", value: reading.calciumHardness, unit: "ppm", ok: reading.calciumHardness !== null && reading.calciumHardness >= 150 && reading.calciumHardness <= 400 },
          { label: "Cyanuric Acid", value: reading.cyanuricAcid, unit: "ppm", ok: reading.cyanuricAcid !== null && reading.cyanuricAcid >= 30 && reading.cyanuricAcid <= 80 },
          { label: "Water Temp", value: reading.waterTemp, unit: "°F", ok: true },
        ]
          .filter((r) => r.value !== null)
          .map(
            (r) => `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151">${r.label}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:${r.ok ? "#059669" : "#dc2626"}">${r.value} ${r.unit}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${r.ok ? "✅" : "⚠️"}</td>
          </tr>`
          )
          .join("")
      : "<tr><td colspan='3' style='padding:12px;color:#94a3b8;font-size:13px'>No chemistry readings recorded</td></tr>";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Pool Service Report — ${pool?.name ?? "Pool"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; color: #111827; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body style="max-width:680px;margin:0 auto;padding:40px 32px">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #0ea5e9">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;background:#0c4a6e;border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px">🌊</div>
        <div>
          <div style="font-size:18px;font-weight:700;color:#0c4a6e">PoolPal AI</div>
          <div style="font-size:11px;color:#64748b">Professional Pool Service</div>
        </div>
      </div>
      <div style="font-size:22px;font-weight:700;color:#111827;margin-top:12px">Service Report</div>
      <div style="font-size:13px;color:#64748b;margin-top:2px">${date}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Report #</div>
      <div style="font-size:18px;font-weight:700;color:#0ea5e9">RPT-${String(reportId).padStart(4, "0")}</div>
    </div>
  </div>

  <!-- Pool & Client Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px">
    <div style="background:#f8fafc;border-radius:12px;padding:16px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Pool Details</div>
      <div style="font-size:15px;font-weight:700;color:#111827">${pool?.name ?? "—"}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px">${pool?.address ?? "—"}</div>
      <div style="font-size:13px;color:#64748b;margin-top:2px">${pool?.type ?? ""} · ${pool?.volumeGallons?.toLocaleString() ?? "—"} gal</div>
    </div>
    <div style="background:#f8fafc;border-radius:12px;padding:16px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Client</div>
      <div style="font-size:15px;font-weight:700;color:#111827">${pool?.clientName ?? "—"}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px">${pool?.clientEmail ?? ""}</div>
      <div style="font-size:13px;color:#64748b;margin-top:2px">${pool?.clientPhone ?? ""}</div>
    </div>
  </div>

  <!-- Service Checklist -->
  <div style="margin-bottom:28px">
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px">Service Checklist</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Task</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;width:80px">Done</th>
        </tr>
      </thead>
      <tbody>${checkRows}</tbody>
    </table>
  </div>

  <!-- Chemistry Readings -->
  <div style="margin-bottom:28px">
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px">Water Chemistry</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Parameter</th>
          <th style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Reading</th>
          <th style="padding:10px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;width:80px">Status</th>
        </tr>
      </thead>
      <tbody>${chemRows}</tbody>
    </table>
  </div>

  ${
    report.techNotes
      ? `<div style="margin-bottom:28px">
    <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:10px">Technician Notes</div>
    <div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:13px;color:#374151;line-height:1.6">${report.techNotes}</div>
  </div>`
      : ""
  }

  ${
    report.issuesFound
      ? `<div style="margin-bottom:28px;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px">
    <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px">⚠️ Issues Found</div>
    <div style="font-size:13px;color:#92400e">${report.issuesFound}</div>
  </div>`
      : ""
  }

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
    <div style="font-size:11px;color:#94a3b8">Generated by PoolPal AI · poolpalai.com</div>
    <div style="font-size:11px;color:#94a3b8">Thank you for your business!</div>
  </div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Report-Id": String(reportId),
      },
    });
  } catch (err: any) {
    console.error("[api/reports/[id]/pdf]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
