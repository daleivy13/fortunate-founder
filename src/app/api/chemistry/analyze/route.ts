import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI analysis not configured. Add ANTHROPIC_API_KEY to your environment." },
      { status: 503 }
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const body = await req.json();
    const {
      freeChlorine, ph, totalAlkalinity,
      calciumHardness, cyanuricAcid, salt,
      volumeGallons, weather, intelligence,
    } = body;

    // Build weather context block
    let weatherBlock = "Weather: Not available\n";
    if (weather) {
      weatherBlock = `
CURRENT WEATHER CONDITIONS:
Temperature: ${weather.temp}°F (feels like ${weather.feelsLike}°F), High today: ${weather.forecast?.[0]?.high ?? "N/A"}°F
UV Index: ${weather.uvIndex} ${weather.uvIndex >= 10 ? "(EXTREME)" : weather.uvIndex >= 7 ? "(HIGH)" : weather.uvIndex >= 4 ? "(MODERATE)" : "(LOW)"}
Conditions: ${weather.condition} — ${weather.description}
Humidity: ${weather.humidity}%
Wind: ${weather.windSpeed} mph
Recent Rain: ${weather.rain1h}mm in last hour
Rain Forecast (next 48h): ${weather.rainForecast}mm
${weather.alerts?.length > 0 ? `⚠️ WEATHER ALERTS: ${weather.alerts.join(" | ")}` : "No active weather alerts"}

WEATHER-DRIVEN CHEMICAL ADJUSTMENTS ALREADY COMPUTED:
Risk Level: ${intelligence?.riskLevel?.toUpperCase() ?? "UNKNOWN"}
Dosage Multiplier: ${intelligence?.smartDosageMultiplier ?? 1.0}x base rates
${intelligence?.riskReasons?.length > 0 ? `Risk Factors: ${intelligence.riskReasons.join(", ")}` : ""}
`;
    }

    const prompt = `You are an expert pool chemistry technician. A pool service tech has submitted these water readings and you have real-time weather data to give precise, weather-adjusted recommendations.

POOL READINGS:
Volume: ${volumeGallons ?? "Unknown"} gallons
Free Chlorine: ${freeChlorine ?? "Not tested"} ppm (PoolPal target: 3.0–5.0)
pH: ${ph ?? "Not tested"} (target: 7.4–7.6)
Total Alkalinity: ${totalAlkalinity ?? "Not tested"} ppm (target: 80–120)
Calcium Hardness: ${calciumHardness ?? "Not tested"} ppm (target: 200–400)
Cyanuric Acid: ${cyanuricAcid ?? "Not tested"} ppm (target: 30–50)
Salt: ${salt ?? "Not tested"} ppm (target for SWG: 2700–3400)

${weatherBlock}

Provide:
1. ONE-SENTENCE overall status assessment
2. Weather impact — how today's conditions specifically affect this pool's chemistry (be specific about UV, temp, rain)
3. Priority chemical additions in order — use exact US measurements (fl oz, oz, lbs) scaled to the pool volume if provided. If weather multiplier is provided, apply it to chlorine doses.
4. Any safety or procedure warnings based on weather (e.g., don't add powder chemicals in high wind, reschedule in thunderstorm)
5. When to retest and what to look for

Be direct and practical. Write as if texting a trusted field technician — short sentences, no fluff. US units only.`;

    const message = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 700,
      messages:   [{ role: "user", content: prompt }],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("[chemistry/analyze]", error);
    return NextResponse.json({ error: error.message ?? "AI analysis failed" }, { status: 500 });
  }
}
