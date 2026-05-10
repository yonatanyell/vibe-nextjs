"use client";

import { useEffect, useState } from "react";

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
  const [, force] = useState(0);
  useEffect(() => {
    load();
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    force((n) => n + 1);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

export const actions = {
  signIn(provider: string) {
    setState({
      authed: true,
      user: { name: "You", email: `you@${provider}.vibe` },
    });
  },
  signOut() {
    setState({ authed: false, user: null });
  },
  setServices(services: string[]) {
    setState({ services, onboarded: true });
  },
  save(rec: Recommendation) {
    setState((s) =>
      s.saved.find((r) => r.id === rec.id) ? {} : { saved: [rec, ...s.saved] },
    );
  },
  unsave(id: string) {
    setState((s) => ({ saved: s.saved.filter((r) => r.id !== id) }));
  },
  markSeen(id: string) {
    setState((s) => (s.seen.includes(id) ? {} : { seen: [...s.seen, id] }));
  },
  pushChat(turn: ChatTurn) {
    setState((s) => ({ history: [...s.history, turn] }));
  },
  setPrompt(p: string) {
    setState({ lastPrompt: p });
  },
  resetChat() {
    setState({ history: [] });
  },
};
