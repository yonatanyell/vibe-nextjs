"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Check, ChevronLeft, Eye, EyeOff, Sparkles, X } from "lucide-react";
import { VibeHeader } from "@/components/VibeHeader";
import { actions, type Recommendation, useVibe } from "@/lib/store";
import { recommend, REFINEMENT_CHIPS } from "@/lib/mockAi";
import type { PsychometricTranslation } from "@/lib/psychometricTranslator";

export function RecommendationsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const vibe = useVibe();
  const recs = useMemo(() => recommend(q), [q]);
  const [translation, setTranslation] = useState<PsychometricTranslation | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [refineOpen, setRefineOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
  }, [router, vibe.authed]);

  useEffect(() => {
    const prompt = q.trim();
    if (!prompt) {
      setTranslation(null);
      setTranslationError(null);
      return;
    }

    const controller = new AbortController();
    setTranslation(null);
    setTranslationError(null);

    fetch("/api/traits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not translate prompt.");
        setTranslation(payload as PsychometricTranslation);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setTranslationError(error.message);
      });

    return () => controller.abort();
  }, [q]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-700"
        style={{
          background: `radial-gradient(120% 80% at 30% 0%, ${recs[index]?.accent}33, transparent 60%), radial-gradient(100% 70% at 80% 100%, ${recs[index]?.accent}22, transparent 60%)`,
        }}
      />

      <header className="relative z-20 mx-auto flex max-w-md items-center justify-between px-5 pt-6">
        <button onClick={() => router.push("/discover")} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Back">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <VibeHeader onTap={() => setRefineOpen(true)} />
        <div className="flex h-10 w-10 items-center justify-center text-xs font-medium text-muted-foreground">
          {index + 1}/{recs.length}
        </div>
      </header>

      <div className="relative z-10 mx-auto mt-4 max-w-md px-5">
        <button onClick={() => setRefineOpen(true)} className="glass w-full rounded-2xl px-4 py-3 text-left animate-in-up">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-snug text-foreground/90">
                {translation?.rationale || translationError || "Reading the psychological shape of that prompt..."}
              </p>
              {translation && (
                <p className="mt-2 break-words font-mono text-[10px] leading-relaxed text-muted-foreground">
                  [{translation.vector.join(", ")}]
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      <div ref={scrollerRef} onScroll={onScroll} className="snap-x-mandatory no-scrollbar mt-4 flex w-full overflow-x-auto pb-32">
        {recs.map((rec, i) => (
          <div key={rec.id} className="snap-center w-screen shrink-0 px-5 sm:w-full sm:max-w-md sm:mx-auto">
            <RecommendationCard rec={rec} isPrimary={i === 0} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none fixed bottom-24 left-0 right-0 z-30 flex justify-center gap-1.5">
        {recs.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-foreground" : "w-1.5 bg-foreground/30"}`} />
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto max-w-md">
          <button onClick={() => setRefineOpen(true)} className="glass flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-foreground/90 shadow-card-soft">
            <Sparkles className="h-4 w-4 text-primary" />
            Refine the vibe
          </button>
        </div>
      </div>

      {refineOpen && (
        <RefineSheet
          onClose={() => setRefineOpen(false)}
          onSubmit={(prompt) => {
            actions.setPrompt(prompt);
            actions.pushChat({ role: "user", text: prompt });
            setRefineOpen(false);
            router.push(`/recommendations?q=${encodeURIComponent(prompt)}`);
          }}
          basePrompt={q}
        />
      )}
    </main>
  );
}

function RecommendationCard({ rec, isPrimary }: { rec: Recommendation; isPrimary: boolean }) {
  const vibe = useVibe();
  const isSaved = !!vibe.saved.find((r) => r.id === rec.id);
  const isSeen = vibe.seen.includes(rec.id);

  return (
    <article className="animate-fade overflow-hidden rounded-[28px] glass shadow-card-soft">
      <div className="relative aspect-[4/5] w-full overflow-hidden" style={{ background: rec.poster }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        {isPrimary && (
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-foreground/90 px-2.5 py-1 text-[11px] font-semibold text-background">
            <Sparkles className="h-3 w-3" />
            Strongest fit
          </div>
        )}
        <div className="absolute right-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
          {rec.type}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight drop-shadow">{rec.title}</h2>
          <p className="mt-1 text-xs text-white/80">
            {rec.creator} - {rec.year}
          </p>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[14px] leading-snug text-foreground/95">{rec.why}</p>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        <p className="text-sm leading-relaxed text-muted-foreground">{rec.summary}</p>
        <div className="flex flex-wrap gap-1.5">
          {rec.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium text-foreground/85">
              {tag}
            </span>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Available on</p>
          <div className="flex flex-wrap gap-1.5">
            {rec.platforms.map((platform) => (
              <span key={platform} className="rounded-md bg-foreground/10 px-2 py-1 text-[11px] font-medium text-foreground/90">
                {platform}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {rec.ratings.map((rating) => (
            <div key={rating.source} className="rounded-xl border border-border bg-card/40 px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{rating.source}</p>
              <p className="mt-0.5 font-display text-base font-semibold">{rating.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{rec.length}</span>
          {rec.cast && <span className="truncate text-right">{rec.cast.slice(0, 2).join(", ")}</span>}
        </div>
        {rec.social && <p className="mt-2 text-[11.5px] text-primary/90">{rec.social}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => actions.markSeen(rec.id)}
            className={`flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
              isSeen ? "border-transparent bg-foreground/10 text-foreground" : "border-border bg-card/40 text-foreground/90 hover:bg-card/70"
            }`}
          >
            {isSeen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isSeen ? "Marked seen" : "Seen it"}
          </button>
          <button
            onClick={() => (isSaved ? actions.unsave(rec.id) : actions.save(rec))}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
              isSaved ? "bg-foreground text-background" : "bg-gradient-primary text-primary-foreground shadow-glow"
            }`}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {isSaved ? "Saved" : "Save for later"}
          </button>
        </div>
      </div>
    </article>
  );
}

function RefineSheet({ onClose, onSubmit, basePrompt }: { onClose: () => void; onSubmit: (prompt: string) => void; basePrompt: string }) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (chip: string) => setPicked((items) => (items.includes(chip) ? items.filter((item) => item !== chip) : [...items, chip]));

  const submit = () => {
    const refinement = [...picked, text].filter(Boolean).join(", ");
    onSubmit(refinement ? `${basePrompt} - but: ${refinement}` : basePrompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-md rounded-t-[32px] glass border-t border-white/10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-card-soft animate-in-up">
        <div className="mx-auto h-1 w-10 rounded-full bg-foreground/20" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <p className="font-display text-lg font-semibold">Refine the vibe</p>
          </div>
          <button onClick={onClose} className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">Tell me what's a little off and I'll adjust - we don't have to start over.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {REFINEMENT_CHIPS.map((chip) => {
            const on = picked.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => togglePick(chip)}
                className={`flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm transition-all active:scale-[0.97] ${
                  on ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card/40 text-foreground/90"
                }`}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {chip}
              </button>
            );
          })}
        </div>

        <div className="mt-4 glass rounded-2xl p-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Or describe it in your own words..."
            className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>

        <button onClick={submit} className="mt-4 w-full rounded-2xl bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-glow active:scale-[0.98]">
          Tune recommendations
        </button>
      </div>
    </div>
  );
}
