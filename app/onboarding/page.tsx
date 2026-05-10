"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { actions, useVibe } from "@/lib/store";

const GROUPS = [
  { title: "TV & Movies", subtitle: "Where you stream", items: ["Netflix", "HBO Max", "Disney+", "Apple TV+", "Prime Video", "Hulu"] },
  { title: "Podcasts", subtitle: "How you listen", items: ["Spotify", "Apple Podcasts", "Pocket Casts", "YouTube"] },
  { title: "Books", subtitle: "Where you read", items: ["Kindle Unlimited", "Audible", "Apple Books", "Libby"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const vibe = useVibe();
  const [picked, setPicked] = useState<Set<string>>(new Set(vibe.services));

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
  }, [router, vibe.authed]);

  const toggle = (service: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(service)) next.delete(service);
      else next.add(service);
      return next;
    });

  const finish = (services: string[]) => {
    actions.setServices(services);
    router.replace("/discover");
  };

  return (
    <main className="relative min-h-screen overflow-hidden pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-1/3 -left-20 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-md px-6 pt-14">
        <p className="text-sm font-medium text-primary/90">Welcome</p>
        <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight">
          Where do you already
          <br />watch, listen, and read?
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Pick anything you already use - Vibe will only recommend things you can actually open. You can change this any time.
        </p>

        <div className="mt-10 space-y-9">
          {GROUPS.map((group) => (
            <section key={group.title} className="animate-in-up">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold">{group.title}</h2>
                <span className="text-xs text-muted-foreground">{group.subtitle}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => {
                  const on = picked.has(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggle(item)}
                      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                        on
                          ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border-border bg-card/40 text-foreground/90 hover:bg-card/80"
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                      {item}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            onClick={() => finish([])}
            className="flex-1 rounded-2xl px-5 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip for now
          </button>
          <button
            onClick={() => finish(Array.from(picked))}
            className="flex-[2] rounded-2xl bg-gradient-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform active:scale-[0.98]"
          >
            Continue {picked.size > 0 && `- ${picked.size}`}
          </button>
        </div>
      </div>
    </main>
  );
}
