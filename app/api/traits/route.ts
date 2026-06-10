import { NextResponse } from "next/server";
import { analyzePrompt, PsychometricTranslationError } from "@/lib/psychometricTranslator";

export const runtime = "nodejs";

function errorSummary(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: typeof error,
    message: String(error),
  };
}

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
    const analysis = await analyzePrompt(prompt);
    console.log(`[traits] computed prompt vector ${JSON.stringify({ prompt, vector: analysis.vector })}`);
    console.log(`[traits] extracted prompt constraints ${JSON.stringify({ prompt, constraints: analysis.constraints })}`);
    console.log(`[traits] computed prompt weights ${JSON.stringify({ prompt, traitWeights: analysis.traitWeights })}`);
    console.log(`[traits] generated analysis ${JSON.stringify(analysis)}`);
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof PsychometricTranslationError) {
      console.error(
        `[traits] failed ${JSON.stringify({
          prompt,
          status: error.status,
          message: error.message,
          details: error.details,
          error: errorSummary(error),
        })}`,
      );
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(
      `[traits] unexpected failure ${JSON.stringify({
        prompt,
        error: errorSummary(error),
      })}`,
    );
    return NextResponse.json({ error: "Unexpected trait translation failure." }, { status: 500 });
  }
}
