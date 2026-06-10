"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, BookOpen, Check, ChevronDown, Clock3, Film, Headphones, MonitorPlay } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VibeHeader } from "@/components/VibeHeader";
import {
  buildRecommendationUrl,
  MEDIA_TYPE_OPTIONS,
  mediaTypeLabel,
  TIME_FRAME_OPTIONS,
  timeFrameLabel,
  type RecommendationFilters,
  type TimeFrame,
} from "@/lib/filters";
import type { MediaType } from "@/lib/store";
import { actions, useVibe } from "@/lib/store";

const SAMPLES = [
  "I want something smart but light",
  "A podcast for ambitious people",
  "Like Succession but less stressful",
  "Something emotionally deep for tonight",
  "Hour-long drive - teach me something scientific",
  "I liked Breaking Bad and Shrinking - find something like this",
];

export default function DiscoverPage() {
  const router = useRouter();
  const vibe = useVibe();
  const [text, setText] = useState(vibe.lastPrompt || "");
  const [filters, setFilters] = useState<RecommendationFilters>({});
  const [activePicker, setActivePicker] = useState<"type" | "time" | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
    else if (!vibe.onboarded) router.replace("/onboarding");
  }, [router, vibe.authed, vibe.onboarded]);

  useEffect(() => {
    if (!activePicker) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!composerRef.current?.contains(event.target as Node)) setActivePicker(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePicker(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activePicker]);

  const submit = (prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    actions.setPrompt(p);
    actions.pushChat({ role: "user", text: p });
    router.push(buildRecommendationUrl(p, filters));
  };

  const toggleFilter = <T extends string,>(values: T[] | undefined, value: T) =>
    values?.includes(value) ? values.filter((item) => item !== value) : [...(values ?? []), value];

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="relative min-h-screen overflow-hidden pb-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-md items-center justify-between px-6 pt-10">
        <VibeHeader />
        <button
          onClick={() => router.push("/taste")}
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-foreground/80"
          aria-label="Profile"
        >
          {(vibe.user?.name?.[0] ?? "Y").toUpperCase()}
        </button>
      </header>

      <section className="mx-auto max-w-md px-6 pt-10">
        <p className="text-sm font-medium text-primary/90 animate-in-up">{greeting}.</p>
        <h1 className="mt-2 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight animate-in-up" style={{ animationDelay: "60ms" }}>
          What are you
          <br />
          <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            in the mood for?
          </span>
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="mt-8 animate-in-up"
          style={{ animationDelay: "140ms" }}
        >
          <div ref={composerRef} className="glass relative rounded-3xl p-3 shadow-card-soft">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Try: Something emotionally deep for tonight..."
              rows={3}
              className="w-full resize-none bg-transparent px-3 pb-16 pt-2 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(text);
                }
              }}
            />
            <div className="absolute bottom-3 left-3 right-16 flex min-w-0 items-center gap-2">
              <FilterPill
                label={mediaTypeLabel(filters.types)}
                active={activePicker === "type"}
                icon={filters.types?.length === 1 ? <MediaIcon type={filters.types[0]} /> : <MonitorPlay className="h-3.5 w-3.5" />}
                onClick={() => setActivePicker((picker) => (picker === "type" ? null : "type"))}
              />
              <FilterPill
                label={timeFrameLabel(filters.times)}
                active={activePicker === "time"}
                icon={<Clock3 className="h-3.5 w-3.5" />}
                onClick={() => setActivePicker((picker) => (picker === "time" ? null : "time"))}
              />
            </div>
            {activePicker && (
              <div className="absolute bottom-[4.25rem] left-3 z-20 w-[calc(100%-1.5rem)] rounded-2xl border border-white/10 bg-card/95 p-2 shadow-card-soft backdrop-blur-xl animate-fade">
                {activePicker === "type" ? (
                  <FilterPicker
                    options={MEDIA_TYPE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                      icon: <MediaIcon type={option.value} />,
                    }))}
                    selected={filters.types ?? []}
                    anyLabel="Any type"
                    onSelect={(value) => {
                      setFilters((current) => ({ ...current, types: value ? toggleFilter(current.types, value as MediaType) : undefined }));
                    }}
                  />
                ) : (
                  <FilterPicker
                    options={TIME_FRAME_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                      icon: <Clock3 className="h-3.5 w-3.5" />,
                    }))}
                    selected={filters.times ?? []}
                    anyLabel="Any length"
                    onSelect={(value) => {
                      setFilters((current) => ({ ...current, times: value ? toggleFilter(current.times, value as TimeFrame) : undefined }));
                    }}
                  />
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={!text.trim()}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-all duration-300 disabled:opacity-40"
              aria-label="Get recommendations"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
            </button>
          </div>
        </form>

        <div className="mt-8 animate-in-up" style={{ animationDelay: "220ms" }}>
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Try a vibe
          </p>
          <div className="space-y-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                onClick={() => submit(sample)}
                className="group block w-full rounded-2xl border border-border bg-card/40 px-4 py-3 text-left text-sm leading-snug text-foreground/90 transition-all duration-200 hover:border-primary/40 hover:bg-card/80 active:scale-[0.99]"
              >
                <span className="mr-2 text-primary">&quot;</span>
                {sample}
                <span className="ml-1 text-primary">&quot;</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}

function FilterPill({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-[0.97] ${
        active ? "border-primary/40 bg-primary/15 text-foreground" : "border-border bg-card/35 text-foreground/85 hover:bg-card/60"
      }`}
    >
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="truncate">{label}</span>
      <ChevronDown className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${active ? "rotate-180" : ""}`} />
    </button>
  );
}

function FilterPicker({
  options,
  selected,
  anyLabel,
  onSelect,
}: {
  options: { value: string; label: string; icon: ReactNode }[];
  selected: string[];
  anyLabel: string;
  onSelect: (value: string | undefined) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
          !selected.length ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-foreground/5 text-foreground/85 hover:bg-foreground/10"
        }`}
      >
        <span>{anyLabel}</span>
        {!selected.length && <Check className="h-3.5 w-3.5" />}
      </button>
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-all ${
              on ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-foreground/5 text-foreground/85 hover:bg-foreground/10"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0">{option.icon}</span>
              <span className="truncate">{option.label}</span>
            </span>
            {on && <Check className="h-3.5 w-3.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

function MediaIcon({ type }: { type: MediaType }) {
  if (type === "movie") return <Film className="h-3.5 w-3.5" />;
  if (type === "book") return <BookOpen className="h-3.5 w-3.5" />;
  if (type === "podcast") return <Headphones className="h-3.5 w-3.5" />;
  return <MonitorPlay className="h-3.5 w-3.5" />;
}
