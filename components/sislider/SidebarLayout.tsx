"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isPinned, setIsPinned] = useState(true);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar isPinned={isPinned} onTogglePin={() => setIsPinned((p) => !p)} />
      <main
        className={cn(
          "flex-1 p-8 min-w-0 transition-[margin-left] duration-200 ease-out",
          isPinned ? "ml-56" : "ml-14",
        )}
      >
        {children}
      </main>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.jpg"
        alt=""
        aria-hidden="true"
        className="fixed bottom-4 right-5 z-30 w-14 h-14 rounded-full object-cover opacity-25 select-none"
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
