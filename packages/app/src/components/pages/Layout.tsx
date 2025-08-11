import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function Layout({
  children,
  subtitle,
  right,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      className={cn("bg-neutral-100 min-h-screen text-neutral-900")}
      style={{
        // Subtle paper grain using layered gradients
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.015) 1px, transparent 1px)",
        backgroundPosition: "0 0, 10px 10px",
        backgroundSize: "20px 20px, 12px 12px",
      }}
    >
      <header className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-4 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">📰</div>
              <div className="font-heading text-2xl tracking-wide">
                The Daily DUST
              </div>
            </div>
            {subtitle && (
              <div className="text-xs text-text-secondary mt-1 font-accent">
                {subtitle}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-xs text-text-secondary font-accent">
              Est. 2025 • Week 32
            </div>
            {right}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        <div
          className={cn(
            "rounded-md border border-neutral-900 bg-[#f9f7f1] shadow-[0_6px_0_0_#111] overflow-hidden"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
