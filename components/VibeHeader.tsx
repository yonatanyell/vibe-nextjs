"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

export function VibeHeader({ onTap }: { onTap?: () => void }) {
  const inner = (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.4} />
      </div>
      <span className="font-display text-xl font-semibold tracking-tight">vibe</span>
    </div>
  );

  if (onTap) {
    return (
      <button onClick={onTap} className="group" aria-label="Refine with AI">
        {inner}
      </button>
    );
  }

  return (
    <Link href="/discover" className="group">
      {inner}
    </Link>
  );
}
