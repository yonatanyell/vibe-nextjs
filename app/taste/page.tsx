"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { LogOut, Pencil } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { VibeHeader } from "@/components/VibeHeader";
import { actions, useVibe } from "@/lib/store";

const BASE_TRAITS = [
  "emotionally intelligent dialogue",
  "ambitious characters",
  "tension softened with humor",
  "cerebral, propulsive plots",
];

export default function TastePage() {
  const router = useRouter();
  const vibe = useVibe();

  useEffect(() => {
    if (!vibe.authed) router.replace("/");
  }, [router, vibe.authed]);

  const learnedTags = useMemo(() => {
    const counts = new Map<string, number>();
    vibe.saved.forEach((r) => r.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag]) => tag);
  }, [vibe.saved]);

  const stats = [
    { label: "Saved", value: vibe.saved.length },
    { label: "Marked seen", value: vibe.seen.length },
    { label: "Services", value: vibe.services.length },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden pb-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-1/3 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-1/3 -right-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-10">
        <VibeHeader />
        <button
          onClick={() => {
            actions.signOut();
            router.replace("/");
          }}
          className="glass flex h-9 w-9 items-center justify-center rounded-full"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      <section className="mx-auto max-w-md px-5 pt-8">
        <div className="glass rounded-3xl p-6 shadow-card-soft animate-in-up">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-xl font-semibold text-primary-foreground shadow-glow">
              {(vibe.user?.name?.[0] ?? "Y").toUpperCase()}
            </div>
            <div>
              <p className="font-display text-lg font-semibold">{vibe.user?.name ?? "You"}</p>
              <p className="text-xs text-muted-foreground">{vibe.user?.email ?? "guest"}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-card/40 px-3 py-3 text-center">
                <p className="font-display text-xl font-semibold">{stat.value}</p>
                <p className="mt-0.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 glass rounded-3xl p-6 animate-in-up">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Your taste profile</p>
          <h2 className="mt-2 font-display text-xl font-semibold leading-snug">You tend to like...</h2>
          <ul className="mt-4 space-y-2.5">
            {BASE_TRAITS.map((trait) => (
              <li key={trait} className="flex items-start gap-2.5 text-[14.5px] leading-snug">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-primary" />
                <span className="text-foreground/90">{trait}</span>
              </li>
            ))}
          </ul>

          {learnedTags.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Recently emerging</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {learnedTags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11.5px] font-medium text-foreground/85">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 glass rounded-3xl p-6 animate-in-up">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your platforms</p>
            <button onClick={() => router.push("/onboarding")} className="flex items-center gap-1 text-xs font-medium text-primary">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vibe.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">None yet - add a few to filter out things you can't watch.</p>
            ) : (
              vibe.services.map((service) => (
                <span key={service} className="rounded-md bg-foreground/10 px-2.5 py-1 text-[11.5px] font-medium text-foreground/90">
                  {service}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
