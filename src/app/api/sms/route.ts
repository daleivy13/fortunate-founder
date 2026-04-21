import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn("[sms] Twilio not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env.local");
    console.log(`[sms] Would send to ${to}: ${body}`);
    return false;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method:  "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error("[sms] Twilio error:", data.message);
      return false;
    }
    console.log(`[sms] Sent to ${to}, SID: ${data.sid}`);
    return true;
  } catch (err) {
    console.error("[sms] Failed:", err);
    return false;
  }
}

// ── SMS templates ──────────────────────────────────────────────────────────────
const SMS_TEMPLATES = {
  serviceComplete: (clientName: string, address: string, reportUrl: string) =>
    `Hi ${clientName}! Your pool at ${address} has been serviced. View your report: ${reportUrl}`,

  invoiceSent: (clientName: string, amount: number, payUrl: string) =>
    `Hi ${clientName}, you have a new invoice for $${amount}. Pay securely: ${payUrl}`,

  invoicePaid: (clientName: string, amount: number) =>
    `Thank you ${clientName}! Payment of $${amount} received. See you next time!`,

  chemAlert: (clientName: string, issue: string) =>
    `Hi ${clientName}, your pool chemistry needs attention: ${issue}. We'll address it at your next service.`,

  ratingRequest: (clientName: string, techName: string) =>
    `Hi ${clientName}! ${techName} just serviced your pool. How did we do? Reply 1 (poor) to 5 (excellent).`,

  upcomingService: (clientName: string, date: string) =>
    `Hi ${clientName}! Reminder: your pool service is scheduled for ${date}. Reply SKIP to reschedule.`,
};

// ── API Route ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { type, to, data } = await req.json();

    if (!to || !type) {
      return NextResponse.json({ error: "to and type required" }, { status: 400 });
    }

    let body = "";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://poolpalai.com";

    switch (type) {
      case "service_complete":
        body = SMS_TEMPLATES.serviceComplete(
          data.clientName,
          data.address,
          `${baseUrl}/api/reports/${data.reportId}/pdf`
        );
        break;
      case "invoice_sent":
        body = SMS_TEMPLATES.invoiceSent(data.clientName, data.amount, data.payUrl);
        break;
      case "invoice_paid":
        body = SMS_TEMPLATES.invoicePaid(data.clientName, data.amount);
        break;
      case "chem_alert":
        body = SMS_TEMPLATES.chemAlert(data.clientName, data.issue);
        break;
      case "rating_request":
        body = SMS_TEMPLATES.ratingRequest(data.clientName, data.techName);
        break;
      case "upcoming_service":
        body = SMS_TEMPLATES.upcomingService(data.clientName, data.date);
        break;
      default:
        return NextResponse.json({ error: "Unknown SMS type" }, { status: 400 });
    }

    const sent = await sendSMS(to, body);
    return NextResponse.json({ success: sent, body });
  } catch (err: any) {
    console.error("[api/sms]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
