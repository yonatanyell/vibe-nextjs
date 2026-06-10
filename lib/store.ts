"use client";

import { useSyncExternalStore } from "react";
import { canonicalFilterPlatformLabels } from "./platforms";
import { logItemInteraction, logUsageEvent } from "./usage";

export type MediaType = "show" | "movie" | "podcast" | "book";

export type Recommendation = {
  id: string;
  type: MediaType;
  title: string;
  creator: string;
  year: number;
  cast?: string[];
  platforms: string[];
  ratings: { source: string; value: string }[];
  length: string;
  durationMinutes?: number;
  tags: string[];
  why: string;
  summary: string;
  social?: string;
  poster: string;
  accent: string;
};

export type ChatTurn = {
  role: "user" | "ai";
  text: string;
};

export type VibeState = {
  authed: boolean;
  user: { name: string; email: string } | null;
  onboarded: boolean;
  services: string[];
  saved: Recommendation[];
  seen: string[];
  history: ChatTurn[];
  lastPrompt: string;
};

const KEY = "vibe.state.v1";

const defaults: VibeState = {
  authed: false,
  user: null,
  onboarded: false,
  services: [],
  saved: [],
  seen: [],
  history: [],
  lastPrompt: "",
};

const listeners = new Set<() => void>();
let state: VibeState = defaults;
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults, ...JSON.parse(raw) };
  } catch {}
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function setState(patch: Partial<VibeState> | ((s: VibeState) => Partial<VibeState>)) {
  load();
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

export function useVibe(): VibeState {
  return useSyncExternalStore(
    (onStoreChange) => {
      load();
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    () => {
      load();
      return state;
    },
    () => defaults,
  );
}

export const actions = {
  signIn(provider: string) {
    const user = { name: "You", email: `you@${provider}.vibe` };
    setState({
      authed: true,
      user,
    });
    logUsageEvent({
      eventType: "sign_in",
      userEmail: user.email,
      metadata: { provider },
    });
  },
  signOut() {
    const userEmail = state.user?.email ?? null;
    setState({ authed: false, user: null });
    logUsageEvent({ eventType: "sign_out", userEmail });
  },
  setServices(services: string[]) {
    const canonicalServices = canonicalFilterPlatformLabels(services);
    setState({ services: canonicalServices, onboarded: true });
    logUsageEvent({
      eventType: "onboarding_services_set",
      userEmail: state.user?.email,
      metadata: { services: canonicalServices },
    });
  },
  save(rec: Recommendation) {
    setState((s) =>
      s.saved.find((r) => r.id === rec.id) ? {} : { saved: [rec, ...s.saved] },
    );
    logUsageEvent({
      eventType: "recommendation_saved",
      userEmail: state.user?.email,
      contentId: rec.id,
      metadata: { title: rec.title, mediaType: rec.type },
    });
    logItemInteraction({
      itemId: rec.id,
      interactionType: "saved",
      metadata: { title: rec.title, mediaType: rec.type },
    });
  },
  unsave(id: string) {
    setState((s) => ({ saved: s.saved.filter((r) => r.id !== id) }));
    logUsageEvent({
      eventType: "recommendation_unsaved",
      userEmail: state.user?.email,
      contentId: id,
    });
    logItemInteraction({ itemId: id, interactionType: "unsaved" });
  },
  markSeen(id: string) {
    setState((s) => (s.seen.includes(id) ? {} : { seen: [...s.seen, id] }));
    logUsageEvent({
      eventType: "recommendation_seen",
      userEmail: state.user?.email,
      contentId: id,
    });
    logItemInteraction({ itemId: id, interactionType: "seen" });
  },
  pushChat(turn: ChatTurn) {
    setState((s) => ({ history: [...s.history, turn] }));
    logUsageEvent({
      eventType: "chat_turn_added",
      userEmail: state.user?.email,
      metadata: { role: turn.role, text: turn.text },
    });
  },
  setPrompt(p: string) {
    setState({ lastPrompt: p });
  },
  resetChat() {
    setState({ history: [] });
  },
};
