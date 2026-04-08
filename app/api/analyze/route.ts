import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey: bodyKey, text } = await req.json();

    // Use provided key, or fall back to server env var (local dev)
    const apiKey = bodyKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        { error: "No valid API key. Paste your key in the reader, or set ANTHROPIC_API_KEY in .env.local for local use." },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || text.length < 50) {
      return NextResponse.json(
        { error: "Text too short to analyze" },
        { status: 400 }
      );
    }

    const truncated = text.substring(0, 25000);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `You are a scientific paper analyzer. Given raw text from an academic paper, identify and extract sections. Return ONLY valid JSON, no markdown, no backticks, no preamble.

Return this exact structure:
{
  "paper_title": "string",
  "ai_summary": "A 3-4 sentence summary of the key findings and significance. Be specific about results, not generic.",
  "sections": [
    {
      "type": "abstract|introduction|background|methods|results|discussion|conclusion|references|supplementary|other",
      "heading": "Original or inferred section heading",
      "content": "Full text content, cleaned up. Remove figure/table refs, citation numbers, page headers/footers. Keep scientific content intact.",
      "summary": "1-2 sentence summary",
      "speed_note": "Brief speed recommendation"
    }
  ]
}

Rules:
- Identify standard sections even if headings are missing or mangled by PDF extraction
- Clean OCR/extraction artifacts
- Remove reference lists content but note them as a section
- Remove figure captions, table data, image descriptions
- If text is not a scientific paper, segment it logically
- The ai_summary must be genuinely insightful, not generic`,
        messages: [
          {
            role: "user",
            content: `Analyze this paper and return structured JSON:\n\n${truncated}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg =
        response.status === 401
          ? "Invalid API key"
          : response.status === 429
          ? "Rate limited — try again in a moment"
          : `Anthropic API error (${response.status})`;
      return NextResponse.json({ error: errMsg, details: errData }, { status: response.status });
    }

    const data = await response.json();
    const textContent = data.content
      ?.map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
      .join("");

    const cleaned = textContent?.replace(/```json|```/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: cleaned?.substring(0, 500) },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
