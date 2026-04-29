import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Image, Font,
} from "@react-pdf/renderer";

const NAVY  = "#1756a9";
const LIGHT = "#e8f1fc";
const GRAY  = "#64748b";
const LGRAY = "#f8fafc";
const BDR   = "#e2e8f0";

const styles = StyleSheet.create({
  page:          { fontFamily: "Helvetica", fontSize: 10, color: "#0f172a", padding: 40 },
  header:        { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  logo:          { width: 80, height: 80, objectFit: "contain" },
  companyBlock:  { alignItems: "flex-end" },
  companyName:   { fontSize: 14, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  companyMeta:   { fontSize: 9, color: GRAY, marginBottom: 2 },
  title:         { fontSize: 28, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  invoiceMeta:   { flexDirection: "row", gap: 24, marginBottom: 28 },
  metaBox:       { flex: 1 },
  metaLabel:     { fontSize: 8, color: GRAY, textTransform: "uppercase", marginBottom: 3, letterSpacing: 0.5 },
  metaValue:     { fontSize: 11, fontFamily: "Helvetica-Bold" },
  billTo:        { backgroundColor: LGRAY, borderRadius: 6, padding: 14, marginBottom: 24, borderLeft: `3px solid ${NAVY}` },
  billLabel:     { fontSize: 8, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  billName:      { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  billDetail:    { fontSize: 9, color: GRAY, marginBottom: 2 },
  tableHeader:   { flexDirection: "row", backgroundColor: NAVY, borderRadius: 4, padding: "8 10", marginBottom: 2 },
  tableHeaderTxt:{ color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableRow:      { flexDirection: "row", padding: "8 10", borderBottom: `1px solid ${BDR}` },
  tableRowAlt:   { flexDirection: "row", padding: "8 10", borderBottom: `1px solid ${BDR}`, backgroundColor: LGRAY },
  colDesc:       { flex: 3 },
  colQty:        { flex: 1, textAlign: "center" },
  colPrice:      { flex: 1, textAlign: "right" },
  colTotal:      { flex: 1, textAlign: "right" },
  totalsBlock:   { alignItems: "flex-end", marginTop: 16, marginBottom: 24 },
  totalRow:      { flexDirection: "row", justifyContent: "flex-end", marginBottom: 4 },
  totalLabel:    { width: 100, textAlign: "right", color: GRAY, marginRight: 16, fontSize: 9 },
  totalValue:    { width: 80, textAlign: "right", fontSize: 9 },
  grandLabel:    { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold", marginRight: 16, fontSize: 14, color: NAVY },
  grandValue:    { width: 80, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 14, color: NAVY },
  notes:         { backgroundColor: LIGHT, borderRadius: 6, padding: 12, marginBottom: 20 },
  notesLabel:    { fontSize: 8, color: NAVY, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 5 },
  notesText:     { fontSize: 9, color: "#334155", lineHeight: 1.5 },
  footer:        { borderTop: `1px solid ${BDR}`, paddingTop: 14, flexDirection: "row", justifyContent: "space-between" },
  footerText:    { fontSize: 8, color: GRAY },
  payBtn:        { backgroundColor: NAVY, borderRadius: 4, padding: "5 12" },
  payBtnText:    { color: "#fff", fontSize: 8, fontFamily: "Helvetica-Bold" },
  statusBadge:   { alignSelf: "flex-start", backgroundColor: LIGHT, borderRadius: 4, padding: "4 10", marginBottom: 28 },
  statusText:    { color: NAVY, fontFamily: "Helvetica-Bold", fontSize: 10 },
});

interface LineItem { description: string; quantity: number; unitPrice: number; total: number }

interface InvoicePDFProps {
  invoice: {
    id: number;
    clientName: string;
    clientEmail?: string;
    amount: number;
    status: string;
    dueDate?: string;
    lineItems: string;
    notes?: string;
    createdAt: string;
    sentAt?: string;
  };
  company: {
    name: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
    email?: string;
  };
  pool?: { address?: string };
  paymentUrl?: string;
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

function fmtDate(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return s; }
}

export function InvoicePDF({ invoice, company, pool, paymentUrl }: InvoicePDFProps) {
  let lineItems: LineItem[] = [];
  try {
    const parsed = JSON.parse(invoice.lineItems);
    lineItems = Array.isArray(parsed) ? parsed.map((li: any) => ({
      description: li.description ?? li.name ?? "Service",
      quantity:    li.quantity ?? 1,
      unitPrice:   li.unitPrice ?? li.amount ?? invoice.amount,
      total:       li.total ?? (li.quantity ?? 1) * (li.unitPrice ?? li.amount ?? invoice.amount),
    })) : lineItems;
  } catch {}

  if (lineItems.length === 0) {
    lineItems = [{ description: "Pool service", quantity: 1, unitPrice: invoice.amount, total: invoice.amount }];
  }

  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const invoiceNum = `INV-${String(invoice.id).padStart(4, "0")}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {company.logoUrl
              ? <Image src={company.logoUrl} style={styles.logo} />
              : <Text style={{ fontSize: 22, fontFamily: "Helvetica-Bold", color: NAVY }}>{company.name.charAt(0)}</Text>
            }
          </View>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && <Text style={styles.companyMeta}>{company.address}</Text>}
            {company.phone   && <Text style={styles.companyMeta}>{company.phone}</Text>}
            {company.email   && <Text style={styles.companyMeta}>{company.email}</Text>}
          </View>
        </View>

        {/* Title + status */}
        <Text style={styles.title}>INVOICE</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
        </View>

        {/* Meta grid */}
        <View style={styles.invoiceMeta}>
          {[
            { label: "Invoice Number", value: invoiceNum },
            { label: "Issue Date",     value: fmtDate(invoice.createdAt) },
            { label: "Due Date",       value: fmtDate(invoice.dueDate) },
          ].map(m => (
            <View key={m.label} style={styles.metaBox}>
              <Text style={styles.metaLabel}>{m.label}</Text>
              <Text style={styles.metaValue}>{m.value}</Text>
            </View>
          ))}
        </View>

        {/* Bill to */}
        <View style={styles.billTo}>
          <Text style={styles.billLabel}>Bill To</Text>
          <Text style={styles.billName}>{invoice.clientName}</Text>
          {invoice.clientEmail && <Text style={styles.billDetail}>{invoice.clientEmail}</Text>}
          {pool?.address      && <Text style={styles.billDetail}>{pool.address}</Text>}
        </View>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderTxt, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderTxt, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderTxt, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.tableHeaderTxt, styles.colTotal]}>Total</Text>
        </View>
        {lineItems.map((li, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={styles.colDesc}>{li.description}</Text>
            <Text style={styles.colQty}>{li.quantity}</Text>
            <Text style={styles.colPrice}>{fmt(li.unitPrice)}</Text>
            <Text style={styles.colTotal}>{fmt(li.total)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total Due</Text>
            <Text style={styles.grandValue}>{fmt(invoice.amount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text style={styles.footerText}>Thank you for your business!</Text>
            <Text style={[styles.footerText, { marginTop: 3 }]}>Payment is due by {fmtDate(invoice.dueDate)}.</Text>
          </View>
          {paymentUrl && invoice.status === "sent" && (
            <View style={styles.payBtn}>
              <Text style={styles.payBtnText}>Pay Online →</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
