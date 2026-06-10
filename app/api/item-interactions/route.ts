import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const INTERACTION_TYPES = new Set(["saved", "unsaved", "seen", "unseen", "dismissed", "opened", "clicked"]);

type ItemInteractionBody = {
  itemId?: unknown;
  interactionType?: unknown;
  anonymousId?: unknown;
  metadata?: unknown;
};

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asCatalogItemId(value: unknown) {
  const itemId = asOptionalString(value);
  return itemId && /^item_\d{4}$/.test(itemId) ? itemId : null;
}

export async function POST(request: Request) {
  let body: ItemInteractionBody;

  try {
    body = (await request.json()) as ItemInteractionBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const itemId = asCatalogItemId(body.itemId);
  const interactionType = asOptionalString(body.interactionType);
  const anonymousId = asOptionalString(body.anonymousId);

  if (!anonymousId) {
    return NextResponse.json({ error: "anonymousId is required." }, { status: 400 });
  }

  if (!interactionType || !INTERACTION_TYPES.has(interactionType)) {
    return NextResponse.json({ error: "interactionType is invalid." }, { status: 400 });
  }

  if (!itemId) {
    return NextResponse.json({ stored: false, skipped: "item_id_not_in_catalog" });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ stored: false, disabled: true });
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};

  const { error } = await supabase.from("user_item_interactions").insert({
    anonymous_id: anonymousId,
    item_id: itemId,
    interaction_type: interactionType,
    metadata,
  });

  if (error) {
    console.error("[item-interactions] insert failed", error);
    return NextResponse.json({ error: "Could not store item interaction." }, { status: 500 });
  }

  return NextResponse.json({ stored: true });
}

