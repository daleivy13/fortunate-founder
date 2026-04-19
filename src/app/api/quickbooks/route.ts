import { NextRequest, NextResponse } from "next/server";

// QuickBooks Online OAuth 2.0
// Setup: https://developer.intuit.com → Create app → Get Client ID + Secret
// Add to .env: QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET

const QB_AUTH_URL    = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL   = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QB_BASE_URL    = "https://quickbooks.api.intuit.com/v3";
const SCOPES         = "com.intuit.quickbooks.accounting";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // Start OAuth flow
  if (action === "connect") {
    const clientId   = process.env.QUICKBOOKS_CLIENT_ID;
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/quickbooks?action=callback`;

    if (!clientId) {
      return NextResponse.json({ error: "Add QUICKBOOKS_CLIENT_ID to .env.local" }, { status: 400 });
    }

    const params = new URLSearchParams({
      client_id:    clientId,
      response_type:"code",
      scope:        SCOPES,
      redirect_uri: redirectUri,
      state:        Math.random().toString(36).slice(2),
    });

    return NextResponse.redirect(`${QB_AUTH_URL}?${params}`);
  }

  // OAuth callback
  if (action === "callback") {
    const code        = searchParams.get("code");
    const realmId     = searchParams.get("realmId"); // QuickBooks company ID
    const clientId    = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret= process.env.QUICKBOOKS_CLIENT_SECRET;
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUri = `${appUrl}/api/quickbooks?action=callback`;

    if (!code || !clientId || !clientSecret) {
      return NextResponse.redirect(`${appUrl}/settings?qb=error`);
    }

    try {
      // Exchange code for tokens
      const tokenRes = await fetch(QB_TOKEN_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/x-www-form-urlencoded",
          Authorization:   `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      });
      const tokens = await tokenRes.json();

      // Store tokens (in production: save to DB encrypted)
      // tokens.access_token, tokens.refresh_token, realmId

      return NextResponse.redirect(`${appUrl}/settings?qb=connected&realm=${realmId}`);
    } catch {
      return NextResponse.redirect(`${appUrl}/settings?qb=error`);
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { action, companyId, accessToken, realmId } = await req.json();

  // Sync an invoice to QuickBooks
  if (action === "sync_invoice") {
    const { invoice } = await req.json();
    try {
      const qbInvoice = {
        Line: [{
          Amount:      invoice.amount,
          DetailType:  "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef:  { value: "1", name: "Pool Service" },
            UnitPrice: invoice.amount,
            Qty:       1,
          },
        }],
        CustomerRef: { name: invoice.clientName },
        DueDate:     invoice.dueDate,
      };

      const res = await fetch(`${QB_BASE_URL}/company/${realmId}/invoice`, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept:         "application/json",
        },
        body: JSON.stringify(qbInvoice),
      });

      if (!res.ok) throw new Error(`QB error: ${res.status}`);
      const data = await res.json();
      return NextResponse.json({ success: true, qbId: data.Invoice?.Id });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Sync mileage as expense
  if (action === "sync_mileage") {
    const { miles, date, userId } = await req.json();
    const amount = Math.round(miles * 0.67 * 100) / 100;
    try {
      const expense = {
        TxnDate:     date,
        TotalAmt:    amount,
        AccountRef:  { value: "1" }, // Mileage expense account
        Line: [{
          Amount:      amount,
          DetailType:  "AccountBasedExpenseLineDetail",
          Description: `Pool route mileage: ${miles} miles @ $0.67/mi`,
          AccountBasedExpenseLineDetail: { AccountRef: { value: "1" } },
        }],
      };

      const res = await fetch(`${QB_BASE_URL}/company/${realmId}/purchase`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body:    JSON.stringify(expense),
      });

      if (!res.ok) throw new Error(`QB error: ${res.status}`);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
