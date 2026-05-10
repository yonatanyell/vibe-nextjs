"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Sparkles, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { to: "/discover", label: "Discover", icon: Sparkles },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/taste", label: "Taste", icon: User },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div className="glass mx-auto flex max-w-md items-center justify-between rounded-full px-2 py-2 shadow-card-soft">
        {items.map((it) => {
          const active = pathname === it.to || (it.to === "/discover" && pathname.startsWith("/recommendations"));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              href={it.to}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
