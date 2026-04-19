import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      freeChlorine, ph, totalAlkalinity,
      calciumHardness, cyanuricAcid, waterTemp, volumeGallons,
    } = body;

    const prompt = `You are an expert pool chemistry technician. A pool service tech has submitted these water readings:

Pool Volume: ${volumeGallons} gallons
Free Chlorine: ${freeChlorine} ppm (target: 2.0–4.0)
pH: ${ph} (target: 7.2–7.6)
Total Alkalinity: ${totalAlkalinity} ppm (target: 80–120)
Calcium Hardness: ${calciumHardness} ppm (target: 150–400)
Cyanuric Acid (Stabilizer): ${cyanuricAcid} ppm (target: 30–80)
Water Temperature: ${waterTemp}°F

Please provide:
1. A brief assessment of the water chemistry status (1–2 sentences)
2. Root cause analysis — why are these readings likely off?
3. Priority order for adding chemicals, and why order matters
4. Any seasonal or environmental factors to consider
5. One long-term recommendation to prevent recurring issues

Keep your response practical and concise. Use US units (oz, lbs, gallons). Write as if speaking directly to a pool service technician.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error("[chemistry/analyze]", error);
    return NextResponse.json(
      { error: error.message ?? "AI analysis failed" },
      { status: 500 }
    );
  }
}
