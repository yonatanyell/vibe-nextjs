"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VibeHeader } from "@/components/VibeHeader";
import { LIBRARY } from "@/lib/mockAi";
import { actions, useVibe } from "@/lib/store";

export default function SavedPage() {
  const router = useRouter();
  const vibe = useVibe();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
  }, [router, vibe.authed]);

  const moods = useMemo(() => {
    const set = new Set<string>();
    vibe.saved.forEach((r) => r.tags.forEach((tag) => set.add(tag)));
    return ["All", ...Array.from(set).slice(0, 6)];
  }, [vibe.saved]);

  const visible = vibe.saved.filter((r) => filter === "All" || r.tags.includes(filter));
  const searchHits = query
    ? LIBRARY.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()) || r.creator.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-10">
        <VibeHeader />
        <span className="text-xs text-muted-foreground">{vibe.saved.length} saved</span>
      </header>

      <section className="mx-auto max-w-md px-5 pt-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Saved</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">A small library of things future-you will thank you for.</p>

        <div className="mt-5 glass flex items-center gap-2 rounded-2xl px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a title to save..."
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>
        {searchHits.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {searchHits.map((r) => {
              const already = vibe.saved.some((s) => s.id === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    actions.save(r);
                    setQuery("");
                  }}
                  disabled={already}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-card/70 disabled:opacity-50"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: r.poster }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.type} - {r.creator}
                    </p>
                  </div>
                  {already ? <span className="text-xs text-muted-foreground">Saved</span> : <Plus className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {vibe.saved.length > 0 && (
          <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
            {moods.map((mood) => (
              <button
                key={mood}
                onClick={() => setFilter(mood)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  filter === mood ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/40 text-foreground/85"
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          {visible.map((r) => (
            <div key={r.id} className="group overflow-hidden rounded-2xl glass shadow-card-soft animate-in-up">
              <div className="relative aspect-[3/4] w-full" style={{ background: r.poster }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white backdrop-blur">
                  {r.type}
                </span>
                <button onClick={() => actions.unsave(r.id)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity" aria-label="Remove">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="font-display text-sm font-semibold leading-tight text-white drop-shadow">{r.title}</p>
                  <p className="text-[10.5px] text-white/75">{r.creator}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="mt-12 rounded-3xl glass px-6 py-10 text-center">
            <p className="font-display text-lg font-semibold">Nothing saved yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Tap "Save for later" on a recommendation to keep it here.</p>
            <button onClick={() => router.push("/discover")} className="mt-5 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
              Find a vibe
            </button>
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
