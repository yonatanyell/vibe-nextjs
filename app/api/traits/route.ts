import { NextResponse } from "next/server";
import { PsychometricTranslationError, translatePromptToTraitVector } from "@/lib/psychometricTranslator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const prompt = typeof (body as { prompt?: unknown }).prompt === "string" ? (body as { prompt: string }).prompt : "";
  console.log(`[traits] user prompt ${JSON.stringify({ prompt })}`);

  try {
    const translation = await translatePromptToTraitVector(prompt);
    console.log(`[traits] generated translation ${JSON.stringify(translation)}`);
    return NextResponse.json(translation);
  } catch (error) {
    if (error instanceof PsychometricTranslationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[traits] unexpected error", error);
    return NextResponse.json({ error: "Unexpected trait translation failure." }, { status: 500 });
  }
}
