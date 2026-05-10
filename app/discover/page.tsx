"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VibeHeader } from "@/components/VibeHeader";
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

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
    else if (!vibe.onboarded) router.replace("/onboarding");
  }, [router, vibe.authed, vibe.onboarded]);

  const submit = (prompt: string) => {
    const p = prompt.trim();
    if (!p) return;
    actions.setPrompt(p);
    actions.pushChat({ role: "user", text: p });
    router.push(`/recommendations?q=${encodeURIComponent(p)}`);
  };

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
          <div className="glass relative rounded-3xl p-3 shadow-card-soft">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Try: Something emotionally deep for tonight..."
              rows={3}
              className="w-full resize-none bg-transparent px-3 pb-12 pt-2 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(text);
                }
              }}
            />
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
                <span className="mr-2 text-primary">"</span>
                {sample}
                <span className="ml-1 text-primary">"</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
