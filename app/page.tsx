"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { actions, useVibe } from "@/lib/store";

export default function AuthLanding() {
  const router = useRouter();
  const vibe = useVibe();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (vibe.authed) router.replace(vibe.onboarded ? "/discover" : "/onboarding");
  }, [router, vibe.authed, vibe.onboarded]);

  const signIn = (provider: string) => {
    setBusy(provider);
    setTimeout(() => {
      actions.signIn(provider);
      router.replace("/onboarding");
    }, 450);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-10 pt-16">
        <div className="flex items-center gap-2 animate-in-up">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <span className="font-display text-2xl font-semibold tracking-tight">vibe</span>
        </div>

        <div className="mt-16 animate-in-up" style={{ animationDelay: "80ms" }}>
          <h1 className="font-display text-[2.4rem] font-semibold leading-[1.1] tracking-tight">
            What&apos;s the
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              right thing
            </span>
            <br />
            to feel tonight?
          </h1>
          <p className="mt-5 max-w-xs text-base leading-relaxed text-muted-foreground">
            Vibe is a quiet AI companion. Tell it how you feel - get three thoughtful things to watch, read, or listen to.
          </p>
        </div>

        <div className="mt-auto space-y-3 animate-in-up" style={{ animationDelay: "200ms" }}>
          {["Apple", "Google", "Facebook"].map((provider) => (
            <button
              key={provider}
              onClick={() => signIn(provider.toLowerCase())}
              disabled={busy === provider.toLowerCase()}
              className={`flex w-full items-center justify-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium transition-all duration-300 active:scale-[0.98] ${
                provider === "Apple" ? "bg-foreground text-background hover:bg-foreground/90" : "glass text-foreground hover:bg-white/5"
              }`}
            >
              {busy === provider.toLowerCase() ? "Signing in..." : `Continue with ${provider}`}
            </button>
          ))}
          <button
            onClick={() => signIn("email")}
            className="w-full py-3 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Or sign in with email
          </button>
          <p className="pt-2 text-center text-[11px] leading-relaxed text-muted-foreground/80">
            By continuing you agree to Vibe&apos;s Terms & Privacy.
          </p>
        </div>
      </div>
    </main>
  );
}
