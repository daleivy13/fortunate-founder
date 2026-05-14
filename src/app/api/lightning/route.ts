import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ── Tomorrow.io (primary — has actual strike distance data) ───────────────────
async function checkTomorrowIo(lat: number, lon: number) {
  const key = process.env.TOMORROW_IO_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.tomorrow.io/v4/weather/realtime` +
      `?location=${lat},${lon}` +
      `&fields=lightningStrikeCount,lightningStrikeDistanceAvg,weatherCode` +
      `&apikey=${key}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const v = data?.data?.values ?? {};
    return {
      source:          "tomorrow.io" as const,
      hasStrikes:      (v.lightningStrikeCount ?? 0) > 0,
      strikeCount:     v.lightningStrikeCount  ?? 0,
      avgDistanceMiles: v.lightningStrikeDistanceAvg != null
        ? Math.round(v.lightningStrikeDistanceAvg * 0.621371 * 10) / 10
        : null,
    };
  } catch {
    return null;
  }
}

// ── OpenWeather (fallback — condition-based, no exact distance) ───────────────
async function checkOpenWeather(lat: number, lon: number) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall` +
      `?lat=${lat}&lon=${lon}&appid=${key}&units=imperial&exclude=minutely,hourly,daily`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const id   = data?.current?.weather?.[0]?.id ?? 800;
    const isThunderstorm = id >= 200 && id < 300;
    const alerts: string[] = (data?.alerts ?? [])
      .filter((a: any) =>
        /thunder|lightning|electrical/i.test(a.event ?? "") ||
        /thunder|lightning|electrical/i.test(a.description ?? "")
      )
      .map((a: any) => a.event ?? "Severe Weather Alert");

    return {
      source:           "openweather" as const,
      hasStrikes:       isThunderstorm || alerts.length > 0,
      strikeCount:      isThunderstorm ? 1 : 0,
      avgDistanceMiles: isThunderstorm ? null : null, // OW doesn't give distance
      alerts,
    };
  } catch {
    return null;
  }
}

// ── NWS (US only, free, no key, gives warnings by area) ───────────────────────
async function checkNWS(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://api.weather.gov/alerts/active?point=${lat},${lon}&status=actual&urgency=Immediate,Expected`,
      {
        headers: { "User-Agent": "PoolPalApp/1.0" },
        next:    { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const lightningAlerts = (data?.features ?? []).filter((f: any) => {
      const event = f?.properties?.event ?? "";
      const headline = f?.properties?.headline ?? "";
      return /thunder|lightning|electrical/i.test(event) ||
             /thunder|lightning|electrical/i.test(headline);
    });
    return {
      source:           "nws" as const,
      hasStrikes:       lightningAlerts.length > 0,
      strikeCount:      lightningAlerts.length,
      avgDistanceMiles: null,
      alerts:           lightningAlerts.map((f: any) => f?.properties?.headline ?? f?.properties?.event),
    };
  } catch {
    return null;
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lon = parseFloat(searchParams.get("lon") ?? "0");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  // Try sources in order of accuracy
  const result =
    (await checkTomorrowIo(lat, lon)) ??
    (await checkOpenWeather(lat, lon)) ??
    (await checkNWS(lat, lon));

  if (!result) {
    return NextResponse.json({
      hasStrikes:       false,
      strikeCount:      0,
      avgDistanceMiles: null,
      source:           "none",
      message:          "Add TOMORROW_IO_API_KEY or OPENWEATHER_API_KEY for lightning detection. NWS (US-only, free) attempted as fallback.",
    });
  }

  return NextResponse.json(result);
}
