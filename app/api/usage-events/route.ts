import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UsageEventBody = {
  eventType?: unknown;
  userEmail?: unknown;
  contentId?: unknown;
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
  let body: UsageEventBody;

  try {
    body = (await request.json()) as UsageEventBody;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const eventType = asOptionalString(body.eventType);
  if (!eventType) {
    return NextResponse.json({ error: "eventType is required." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ logged: false, disabled: true });
  }

  const metadata =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : {};
  const anonymousId = asOptionalString(body.anonymousId);
  if (!anonymousId) {
    return NextResponse.json({ error: "anonymousId is required." }, { status: 400 });
  }

  const contentId = asOptionalString(body.contentId);
  const itemId = asCatalogItemId(contentId);

  const { error } = await supabase.from("user_events").insert({
    event_type: eventType,
    anonymous_id: anonymousId,
    item_id: itemId,
    metadata: {
      ...metadata,
      ...(contentId && !itemId ? { content_id: contentId } : {}),
      ...(asOptionalString(body.userEmail) ? { user_email: asOptionalString(body.userEmail) } : {}),
    },
  });

  if (error) {
    console.error("[usage-events] insert failed", error);
    return NextResponse.json({ error: "Could not log usage event." }, { status: 500 });
  }

  return NextResponse.json({ logged: true });
}
