import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RecommendationSessionBody = {
  anonymousId?: unknown;
  prompt?: unknown;
  traitVector?: unknown;
  constraints?: unknown;
  recommendations?: unknown;
  metadata?: unknown;
};

type RecommendationResultInput = {
  id?: unknown;
  rank?: unknown;
  similarity?: unknown;
  sourceType?: unknown;
  metadata?: unknown;
};

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asPlainObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asCatalogItemId(value: unknown) {
  const itemId = asOptionalString(value);
  return itemId && /^item_\d{4}$/.test(itemId) ? itemId : null;
}

function asTraitVector(value: unknown) {
  if (
    !Array.isArray(value) ||
    value.length !== 15 ||
    !value.every((score) => Number.isInteger(score) && score >= 1 && score <= 7)
  ) {
    return null;
  }

  return value;
}

export async function POST(request: Request) {
  let body: RecommendationSessionBody;

  try {
    body = (await request.json()) as RecommendationSessionBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const anonymousId = asOptionalString(body.anonymousId);
  const prompt = asOptionalString(body.prompt);
  const traitVector = asTraitVector(body.traitVector);

  if (!anonymousId) {
    return NextResponse.json({ error: "anonymousId is required." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  if (!traitVector) {
    return NextResponse.json({ error: "traitVector must include 15 integer scores from 1 to 7." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ stored: false, disabled: true });
  }

  const { data: session, error: sessionError } = await supabase
    .from("recommendation_sessions")
    .insert({
      anonymous_id: anonymousId,
      prompt,
      trait_vector: traitVector,
      constraints: asPlainObject(body.constraints),
      metadata: asPlainObject(body.metadata),
    })
    .select("id")
    .single();

  if (sessionError) {
    console.error("[recommendation-sessions] session insert failed", sessionError);
    return NextResponse.json({ error: "Could not store recommendation session." }, { status: 500 });
  }

  const recommendations = Array.isArray(body.recommendations)
    ? (body.recommendations as RecommendationResultInput[])
    : [];

  const resultRows = recommendations
    .map((recommendation, index) => {
      const itemId = asCatalogItemId(recommendation.id);
      if (!itemId) return null;

      const rank = Number.isInteger(recommendation.rank) && Number(recommendation.rank) > 0 ? Number(recommendation.rank) : index + 1;
      const similarity = typeof recommendation.similarity === "number" ? recommendation.similarity : null;

      return {
        session_id: session.id,
        item_id: itemId,
        rank,
        similarity,
        source_type: asOptionalString(recommendation.sourceType),
        metadata: asPlainObject(recommendation.metadata),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (resultRows.length) {
    const { error: resultsError } = await supabase.from("recommendation_results").insert(resultRows);
    if (resultsError) {
      console.error("[recommendation-sessions] results insert failed", resultsError);
      return NextResponse.json({ error: "Could not store recommendation results." }, { status: 500 });
    }
  }

  return NextResponse.json({
    stored: true,
    sessionId: session.id,
    resultCount: resultRows.length,
    skippedResultCount: recommendations.length - resultRows.length,
  });
}

