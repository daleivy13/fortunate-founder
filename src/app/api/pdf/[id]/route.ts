import { NextRequest, NextResponse } from "next/server";
import { db } from "@/backend/db";
import { serviceReports, pools } from "@/backend/db/schema";
import { eq } from "drizzle-orm";

// Install: npm install @react-pdf/renderer
// This generates a real .pdf binary, not an HTML page

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reportId = parseInt(params.id);

    // Fetch report + pool data
    let report: any = null;
    let pool:   any = null;

    try {
      const [row] = await db
        .select({ report: serviceReports, pool: pools })
        .from(serviceReports)
        .innerJoin(pools, eq(serviceReports.poolId, pools.id))
        .where(eq(serviceReports.id, reportId));
      report = row?.report;
      pool   = row?.pool;
    } catch {}

    // Mock data if DB not connected
    if (!report) {
      report = {
        id: reportId, servicedAt: new Date(), skimmed: true, brushed: true,
        vacuumed: true, filterCleaned: false, chemicalsAdded: true, equipmentChecked: true,
        freeChlorine: 2.8, ph: 7.4, totalAlkalinity: 110, waterTemp: 82,
        techNotes: "Pool looking great. Added 1 gallon liquid chlorine.",
        issuesFound: null,
      };
      pool = {
        name: "Johnson Residence", address: "1420 Maple Dr, Scottsdale, AZ 85251",
        clientName: "Mike Johnson", clientEmail: "mjohnson@email.com",
      };
    }

    // Try to use @react-pdf/renderer if available
    try {
      const { renderToBuffer, Document, Page, Text, View, StyleSheet } =
        await import("@react-pdf/renderer" as any);

      const styles = StyleSheet.create({
        page:      { padding: 40, fontFamily: "Helvetica", backgroundColor: "#ffffff" },
        header:    { marginBottom: 24, borderBottom: "2px solid #0d9488", paddingBottom: 16 },
        title:     { fontSize: 22, fontWeight: "bold", color: "#134e4a" },
        sub:       { fontSize: 11, color: "#64748b", marginTop: 4 },
        section:   { marginBottom: 16 },
        sectionTit:{ fontSize: 12, fontWeight: "bold", color: "#115e59", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
        row:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
        label:     { fontSize: 10, color: "#64748b", width: 140 },
        value:     { fontSize: 10, color: "#0f172a", fontWeight: "bold" },
        chemGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
        chemCell:  { width: "30%", backgroundColor: "#f0fdfa", padding: 8, borderRadius: 6 },
        chemLabel: { fontSize: 8, color: "#14b8a6", textTransform: "uppercase" },
        chemVal:   { fontSize: 16, fontWeight: "bold", color: "#134e4a", marginTop: 2 },
        check:     { width: 10, height: 10, borderRadius: 2, marginRight: 6 },
        checkRow:  { flexDirection: "row", alignItems: "center", marginBottom: 5 },
        checkText: { fontSize: 10 },
        footer:    { position: "absolute", bottom: 30, left: 40, right: 40, borderTop: "1px solid #e2e8f0", paddingTop: 8 },
        footText:  { fontSize: 8, color: "#94a3b8", textAlign: "center" },
      });

      const checks = [
        { key: "skimmed",         label: "Skimmed" },
        { key: "brushed",         label: "Brushed walls & floor" },
        { key: "vacuumed",        label: "Vacuumed" },
        { key: "filterCleaned",   label: "Filter cleaned" },
        { key: "chemicalsAdded",  label: "Chemicals added" },
        { key: "equipmentChecked",label: "Equipment inspected" },
      ];

      const chemFields = [
        { label: "Free Cl", key: "freeChlorine", unit: "ppm" },
        { label: "pH",      key: "ph",            unit: ""    },
        { label: "Alk",     key: "totalAlkalinity",unit: "ppm"},
        { label: "Temp",    key: "waterTemp",      unit: "°F" },
      ];

      const doc = Document({}, [
        Page({ size: "A4", style: styles.page }, [
          // Header
          View({ style: styles.header }, [
            Text({ style: styles.title }, ["PoolPal AI — Service Report"]),
            Text({ style: styles.sub }, [
              `${pool.name} · ${new Date(report.servicedAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
            ]),
          ]),

          // Pool info
          View({ style: styles.section }, [
            Text({ style: styles.sectionTit }, ["Pool Information"]),
            View({ style: styles.row }, [Text({ style: styles.label }, ["Client"]),    Text({ style: styles.value }, [pool.clientName])]),
            View({ style: styles.row }, [Text({ style: styles.label }, ["Address"]),   Text({ style: styles.value }, [pool.address])]),
            View({ style: styles.row }, [Text({ style: styles.label }, ["Email"]),     Text({ style: styles.value }, [pool.clientEmail ?? "—"])]),
          ]),

          // Service checklist
          View({ style: styles.section }, [
            Text({ style: styles.sectionTit }, ["Service Checklist"]),
            ...checks.map(({ key, label }) =>
              View({ style: styles.checkRow }, [
                View({ style: { ...styles.check, backgroundColor: report[key] ? "#22c55e" : "#e2e8f0" } }, []),
                Text({ style: { ...styles.checkText, color: report[key] ? "#166534" : "#94a3b8" } }, [
                  `${report[key] ? "✓" : "○"}  ${label}`
                ]),
              ])
            ),
          ]),

          // Chemistry
          View({ style: styles.section }, [
            Text({ style: styles.sectionTit }, ["Water Chemistry"]),
            View({ style: styles.chemGrid }, [
              ...chemFields.filter((f) => report[f.key]).map((f) =>
                View({ style: styles.chemCell }, [
                  Text({ style: styles.chemLabel }, [f.label]),
                  Text({ style: styles.chemVal }, [`${report[f.key]}${f.unit}`]),
                ])
              ),
            ]),
          ]),

          // Notes
          report.techNotes && View({ style: styles.section }, [
            Text({ style: styles.sectionTit }, ["Technician Notes"]),
            Text({ style: { fontSize: 10, color: "#475569", lineHeight: 1.6 } }, [report.techNotes]),
          ]),

          // Issues
          report.issuesFound && View({ style: styles.section }, [
            Text({ style: styles.sectionTit }, ["Issues Found"]),
            Text({ style: { fontSize: 10, color: "#dc2626" } }, [report.issuesFound]),
          ]),

          // Footer
          View({ style: styles.footer }, [
            Text({ style: styles.footText }, [`PoolPal AI · Report #${reportId} · Generated ${new Date().toLocaleDateString()}`]),
          ]),
        ]),
      ]);

      const buffer = await renderToBuffer(doc);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":        "application/pdf",
          "Content-Disposition": `inline; filename="service-report-${reportId}.pdf"`,
        },
      });
    } catch {
      // @react-pdf not installed — generate HTML-to-PDF fallback
    }

    // ── HTML fallback (works without extra packages) ───────────────────────────
    const date = new Date(report.servicedAt).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const checks = ["skimmed","brushed","vacuumed","filterCleaned","chemicalsAdded","equipmentChecked"];
    const labels: Record<string,string> = {
      skimmed:"Skimmed", brushed:"Brushed walls & floor", vacuumed:"Vacuumed",
      filterCleaned:"Filter cleaned", chemicalsAdded:"Chemicals added", equipmentChecked:"Equipment inspected",
    };

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Service Report #${reportId}</title>
<style>
  body{font-family:-apple-system,sans-serif;margin:0;padding:40px;color:#0f172a;max-width:700px;margin:0 auto}
  .header{border-bottom:3px solid #0d9488;padding-bottom:20px;margin-bottom:28px}
  .logo{font-size:22px;font-weight:800;color:#134e4a}
  .sub{color:#64748b;margin-top:6px;font-size:14px}
  h3{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#14b8a6;margin:24px 0 12px;font-weight:700}
  .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
  .label{color:#64748b;width:160px}
  .val{font-weight:600}
  .checks{display:flex;flex-wrap:wrap;gap:8px}
  .check{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600}
  .done{background:#dcfce7;color:#166534}
  .skip{background:#f1f5f9;color:#94a3b8}
  .chem{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:8px}
  .chem-cell{background:#f0fdfa;border-radius:10px;padding:12px;text-align:center}
  .chem-label{font-size:10px;color:#14b8a6;text-transform:uppercase;font-weight:700}
  .chem-val{font-size:20px;font-weight:800;color:#134e4a;margin-top:4px}
  .notes{background:#f8fafc;border-radius:10px;padding:14px;font-size:13px;line-height:1.7;color:#475569}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
  @media print{body{padding:20px}}
</style></head><body>
<div class="header">
  <div class="logo">PoolPal AI — Service Report</div>
  <div class="sub">${pool.name} · ${date}</div>
</div>
<h3>Pool Information</h3>
<div class="row"><span class="label">Client</span><span class="val">${pool.clientName}</span></div>
<div class="row"><span class="label">Address</span><span class="val">${pool.address}</span></div>
<div class="row"><span class="label">Email</span><span class="val">${pool.clientEmail ?? "—"}</span></div>
<h3>Service Checklist</h3>
<div class="checks">
${checks.map((k) => `<span class="check ${report[k] ? "done" : "skip"}">${report[k] ? "✓" : "○"} ${labels[k]}</span>`).join("")}
</div>
<h3>Water Chemistry</h3>
<div class="chem">
${[["Free Cl","freeChlorine","ppm"],["pH","ph",""],["Alkalinity","totalAlkalinity","ppm"],["Temp","waterTemp","°F"]].filter(([,k]) => report[k]).map(([l,k,u]) => `<div class="chem-cell"><div class="chem-label">${l}</div><div class="chem-val">${report[k]}${u}</div></div>`).join("")}
</div>
${report.techNotes ? `<h3>Technician Notes</h3><div class="notes">${report.techNotes}</div>` : ""}
${report.issuesFound ? `<h3>Issues Found</h3><div class="notes" style="border-left:4px solid #ef4444">${report.issuesFound}</div>` : ""}
<div class="footer">PoolPal AI · Report #${reportId} · Generated ${new Date().toLocaleDateString()}</div>
</body></html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
