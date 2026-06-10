export type UsageEventPayload = {
  eventType: string;
  userEmail?: string | null;
  contentId?: string | null;
  anonymousId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ItemInteractionType = "saved" | "unsaved" | "seen" | "unseen" | "dismissed" | "opened" | "clicked";

export type ItemInteractionPayload = {
  itemId: string;
  interactionType: ItemInteractionType;
  anonymousId?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecommendationSessionResultPayload = {
  id: string;
  rank?: number;
  similarity?: number | null;
  sourceType?: string | null;
  metadata?: Record<string, unknown>;
};

export type RecommendationSessionPayload = {
  prompt: string;
  traitVector: number[];
  constraints?: Record<string, unknown>;
  recommendations?: RecommendationSessionResultPayload[];
  anonymousId?: string | null;
  metadata?: Record<string, unknown>;
};

const ANONYMOUS_ID_KEY = "vibe.anonymousId.v1";

export function getAnonymousId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    localStorage.setItem(ANONYMOUS_ID_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

export function logUsageEvent(event: UsageEventPayload) {
  if (typeof window === "undefined") return;

  const anonymousId = event.anonymousId ?? getAnonymousId();

  fetch("/api/usage-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...event, anonymousId }),
    keepalive: true,
  }).catch(() => {
    // Usage logging must never block the MVP flow.
  });
}

export function logItemInteraction(interaction: ItemInteractionPayload) {
  if (typeof window === "undefined") return;

  const anonymousId = interaction.anonymousId ?? getAnonymousId();

  fetch("/api/item-interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...interaction, anonymousId }),
    keepalive: true,
  }).catch(() => {
    // Durable interaction logging must never block local UI state.
  });
}

export function logRecommendationSession(session: RecommendationSessionPayload) {
  if (typeof window === "undefined") return;

  const anonymousId = session.anonymousId ?? getAnonymousId();

  fetch("/api/recommendation-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...session, anonymousId }),
    keepalive: true,
  }).catch(() => {
    // Recommendation history should never interrupt the recommendation UI.
  });
}
