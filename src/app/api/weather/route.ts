import { NextRequest, NextResponse } from "next/server";

export interface WeatherData {
  temp:         number;   // Fahrenheit
  feelsLike:    number;
  humidity:     number;   // %
  uvIndex:      number;
  windSpeed:    number;   // mph
  rain1h:       number;   // mm in last hour
  rainForecast: number;   // mm expected next 24h
  condition:    string;   // "Clear", "Rain", "Thunderstorm", etc.
  description:  string;
  alerts:       string[];
  forecast:     { day: string; high: number; low: number; rain: number; uvi: number }[];
}

export interface PoolIntelligence {
  weather:          WeatherData;
  chemAdjustments:  ChemAdjustment[];
  procedureAlerts:  ProcedureAlert[];
  riskLevel:        "low" | "medium" | "high" | "critical";
  riskReasons:      string[];
  smartDosageMultiplier: number; // multiply base dosages by this
}

export interface ChemAdjustment {
  parameter:  string;
  adjustment: string;
  reason:     string;
  urgency:    "info" | "warn" | "critical";
}

export interface ProcedureAlert {
  type:    string;
  message: string;
  icon:    string;
  urgency: "info" | "warn" | "critical";
}

// ── Weather fetcher ────────────────────────────────────────────────────────────
async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;

  try {
    // One Call API 3.0 — current + forecast + alerts
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}&appid=${key}&units=imperial&exclude=minutely,hourly`,
      { next: { revalidate: 1800 } } // cache 30 min
    );
    if (!res.ok) return null;
    const data = await res.json();

    const current = data.current;
    const daily   = data.daily ?? [];

    // Sum rain from next 24h forecast
    const rainForecast = daily.slice(0, 2).reduce((s: number, d: any) => s + (d.rain ?? 0), 0);

    return {
      temp:         Math.round(current.temp),
      feelsLike:    Math.round(current.feels_like),
      humidity:     current.humidity,
      uvIndex:      current.uvi,
      windSpeed:    Math.round(current.wind_speed),
      rain1h:       current.rain?.["1h"] ?? 0,
      rainForecast: Math.round(rainForecast * 10) / 10,
      condition:    current.weather[0]?.main ?? "Clear",
      description:  current.weather[0]?.description ?? "",
      alerts:       (data.alerts ?? []).map((a: any) => a.description),
      forecast:     daily.slice(0, 5).map((d: any) => ({
        day:  new Date(d.dt * 1000).toLocaleDateString("en-US", { weekday: "short" }),
        high: Math.round(d.temp.max),
        low:  Math.round(d.temp.min),
        rain: d.rain ?? 0,
        uvi:  d.uvi,
      })),
    };
  } catch {
    return null;
  }
}

// ── Pool chemistry intelligence ─────────────────────────────────────────────────
function analyzeForPool(
  weather: WeatherData,
  pool: { volumeGallons: number; lastCl?: number; lastPh?: number; lastCya?: number }
): PoolIntelligence {
  const adjustments: ChemAdjustment[] = [];
  const alerts:       ProcedureAlert[] = [];
  const riskReasons:  string[]         = [];
  let   riskScore    = 0;
  let   doseMultiplier = 1.0;

  // ── Temperature adjustments ────────────────────────────────────────────────
  if (weather.temp >= 95) {
    adjustments.push({ parameter: "Chlorine", adjustment: "Increase dose by 40%", reason: `${weather.temp}°F — extreme heat burns chlorine rapidly`, urgency: "critical" });
    doseMultiplier *= 1.4;
    riskScore += 3;
    riskReasons.push(`Extreme heat (${weather.temp}°F) — fast chlorine depletion`);
  } else if (weather.temp >= 85) {
    adjustments.push({ parameter: "Chlorine", adjustment: "Increase dose by 20%", reason: `${weather.temp}°F — warm water speeds chemical consumption`, urgency: "warn" });
    doseMultiplier *= 1.2;
    riskScore += 1;
  } else if (weather.temp <= 60) {
    adjustments.push({ parameter: "Chlorine", adjustment: "Reduce dose by 15%", reason: `${weather.temp}°F — cool water slows chemical demand`, urgency: "info" });
    doseMultiplier *= 0.85;
  }

  // ── UV Index adjustments ────────────────────────────────────────────────────
  if (weather.uvIndex >= 10) {
    adjustments.push({ parameter: "Cyanuric Acid (Stabilizer)", adjustment: "Test CYA — should be 50–80 ppm in extreme UV", reason: `UV index ${weather.uvIndex} — chlorine depletes in minutes without stabilizer`, urgency: "critical" });
    riskScore += 3;
    riskReasons.push(`Extreme UV (${weather.uvIndex}) — stabilizer critical today`);
  } else if (weather.uvIndex >= 7) {
    adjustments.push({ parameter: "Cyanuric Acid (Stabilizer)", adjustment: "Verify CYA is at least 40 ppm", reason: `UV index ${weather.uvIndex} — high UV destroys unstabilized chlorine`, urgency: "warn" });
    riskScore += 1;
  }

  // ── Recent rainfall ─────────────────────────────────────────────────────────
  if (weather.rain1h >= 10) {
    adjustments.push({ parameter: "All chemistry", adjustment: "Full retest required — rain diluted the pool", reason: `${weather.rain1h}mm rain in last hour — chemistry is diluted`, urgency: "critical" });
    alerts.push({ type: "Heavy Rain", message: "Heavy rain detected. Retest all chemistry before adding any chemicals.", icon: "🌧️", urgency: "critical" });
    riskScore += 4;
    riskReasons.push(`Heavy rainfall (${weather.rain1h}mm) — full retest needed`);
  } else if (weather.rain1h >= 2) {
    adjustments.push({ parameter: "pH & Chlorine", adjustment: "Retest — rain may have shifted balance", reason: `${weather.rain1h}mm recent rain — slight dilution effect`, urgency: "warn" });
    riskScore += 2;
  }

  // ── Rain forecast ────────────────────────────────────────────────────────────
  if (weather.rainForecast >= 25) {
    alerts.push({ type: "Rain Forecast", message: `${weather.rainForecast}mm of rain expected. Consider shock treatment before storm to compensate for dilution.`, icon: "⛈️", urgency: "warn" });
    adjustments.push({ parameter: "Chlorine", adjustment: "Add 25% extra — rain coming", reason: `Heavy rain forecast will dilute chemicals`, urgency: "warn" });
    doseMultiplier *= 1.25;
  } else if (weather.rainForecast >= 5) {
    alerts.push({ type: "Rain Forecast", message: `${weather.rainForecast}mm expected today. Monitor chemistry after rain.`, icon: "🌦️", urgency: "info" });
  }

  // ── Wind ─────────────────────────────────────────────────────────────────────
  if (weather.windSpeed >= 25) {
    alerts.push({ type: "High Wind", message: `${weather.windSpeed}mph winds — expect heavy debris. Extra skimming required. Avoid adding dry chemicals.`, icon: "💨", urgency: "warn" });
    adjustments.push({ parameter: "Procedure", adjustment: "Skip powder chemicals — add liquids only in high wind", reason: "Powder chemicals blow back and can cause chemical burns", urgency: "critical" });
    riskScore += 1;
  } else if (weather.windSpeed >= 15) {
    alerts.push({ type: "Moderate Wind", message: `${weather.windSpeed}mph — extra debris expected. Allow extra skimming time.`, icon: "🌬️", urgency: "info" });
  }

  // ── Humidity ─────────────────────────────────────────────────────────────────
  if (weather.humidity >= 85 && weather.temp >= 75) {
    adjustments.push({ parameter: "Algae Prevention", adjustment: "Add algaecide preventatively", reason: `High humidity (${weather.humidity}%) + heat creates ideal algae conditions`, urgency: "warn" });
    riskScore += 2;
    riskReasons.push(`High humidity + heat — algae risk elevated`);
  }

  // ── Weather alerts ────────────────────────────────────────────────────────────
  if (weather.alerts.length > 0) {
    alerts.push({ type: "Weather Alert", message: `Official weather alert: ${weather.alerts[0].slice(0, 200)}`, icon: "⚠️", urgency: "critical" });
    riskScore += 3;
  }

  // ── Thunderstorm ──────────────────────────────────────────────────────────────
  if (weather.condition === "Thunderstorm") {
    alerts.push({ type: "Thunderstorm", message: "Do NOT service this pool during thunderstorm. Reschedule or wait for storm to pass.", icon: "⚡", urgency: "critical" });
    riskScore += 5;
    riskReasons.push("Active thunderstorm — do not service");
  }

  // ── Algae composite risk ──────────────────────────────────────────────────────
  const cl = pool.lastCl ?? 2;
  if (cl < 1.0 && weather.temp >= 80 && weather.uvIndex >= 6) {
    riskScore += 4;
    riskReasons.push(`Low chlorine + heat + UV = high algae risk`);
    adjustments.push({ parameter: "Shock Treatment", adjustment: "Shock the pool today", reason: "Low Cl + high temp + high UV = algae will bloom within 24–48 hours", urgency: "critical" });
  }

  // ── Risk level ────────────────────────────────────────────────────────────────
  const riskLevel: PoolIntelligence["riskLevel"] =
    riskScore >= 8 ? "critical" :
    riskScore >= 5 ? "high"     :
    riskScore >= 2 ? "medium"   : "low";

  return {
    weather,
    chemAdjustments:       adjustments,
    procedureAlerts:       alerts,
    riskLevel,
    riskReasons,
    smartDosageMultiplier: Math.round(doseMultiplier * 100) / 100,
  };
}

// ── API Route ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat  = parseFloat(searchParams.get("lat")  ?? "0");
    const lng  = parseFloat(searchParams.get("lng")  ?? "0");
    const vol  = parseFloat(searchParams.get("vol")  ?? "15000");
    const lastCl  = parseFloat(searchParams.get("cl")  ?? "2");
    const lastCya = parseFloat(searchParams.get("cya") ?? "40");

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const weather = await fetchWeather(lat, lng);

    if (!weather) {
      // Return a fallback if no API key or request fails
      return NextResponse.json({
        weather: null,
        intelligence: null,
        message: "Add OPENWEATHER_API_KEY to .env.local for weather intelligence",
      });
    }

    const intelligence = analyzeForPool(weather, { volumeGallons: vol, lastCl, lastCya });

    return NextResponse.json({ weather, intelligence });
  } catch (err: any) {
    console.error("[api/weather]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
