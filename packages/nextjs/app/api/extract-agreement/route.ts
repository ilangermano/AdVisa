import { NextRequest, NextResponse } from "next/server";
import type { ExtractionResult } from "~~/types/advisa";

export const runtime = "nodejs";

const EXTRACTION_PROMPT = `You are reviewing a New Zealand immigration adviser fee agreement.

Return ONLY a JSON object — no markdown fences, no prose, no explanation before or after.

{
  "milestones": [{ "name": "", "description": "", "amount": 0, "dueInWorkingDays": 0 }],
  "totalFee": 0,
  "currency": "NZD",
  "plainLanguageSummary": "",
  "translatedSummary": "",
  "redFlags": [{ "severity": "high|medium|low", "issue": "" }]
}

Field rules:
- milestones: one entry per payment stage. amount is the NZD dollar value (e.g. 800, not 80000). dueInWorkingDays is the number of NZ working days from engagement start; use 0 if the stage has no fixed deadline (e.g. awaiting INZ decision).
- totalFee: total fee in NZD as a number.
- currency: always the string "NZD".
- plainLanguageSummary: 3–4 sentence plain-English summary a migrant with no legal background can understand. Focus on what is being paid, when, and what the adviser must do at each stage.
- translatedSummary: the same plain-language summary translated into Hindi (Devanagari script).
- redFlags: flag every instance of the following — include one entry per issue found, or an empty array if none:
  - Total fee below NZ$2,000 or above NZ$6,000 → severity "high"
  - Any milestone or deliverable that is vague or not independently verifiable (e.g. "best efforts", "as required") → severity "medium"
  - No conflict-of-interest declaration present → severity "medium"
  - Any clause that ties a payment to the visa being approved or refused → severity "high"
  - Any instruction to pay money outside this agreement or to a third party not named in it → severity "high"

Return ONLY the JSON object. Nothing else.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY is not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  let pdfBase64: string;
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;
    if (!file) {
      return NextResponse.json({ error: "pdf field required" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "file must be a PDF" }, { status: 400 });
    }
    const buffer = await file.arrayBuffer();
    pdfBase64 = Buffer.from(buffer).toString("base64");
  } catch {
    return NextResponse.json({ error: "failed to read uploaded file" }, { status: 400 });
  }

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Anthropic fetch failed:", err);
    return NextResponse.json({ error: "could not reach extraction service" }, { status: 502 });
  }

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    console.error("Anthropic API error:", anthropicRes.status, body);
    return NextResponse.json({ error: "extraction failed" }, { status: 502 });
  }

  const anthropicBody = await anthropicRes.json();
  const rawText: string = anthropicBody.content?.[0]?.text ?? "";

  // Strip ``` fences in case the model disobeys the prompt
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let result: ExtractionResult;
  try {
    result = JSON.parse(cleaned) as ExtractionResult;
  } catch {
    console.error("Failed to parse Anthropic response as JSON:", rawText);
    return NextResponse.json({ error: "extraction returned unparseable output" }, { status: 502 });
  }

  return NextResponse.json(result);
}
