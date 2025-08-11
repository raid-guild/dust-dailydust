import type { ReactNode } from "react";
import { ThemeToggle } from "../ThemeToggle";

export function Layout({ children, subtitle, right }: { children: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="container max-w-6xl mx-auto py-4">
      <header className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-4 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">📰</div>
              <div className="font-heading text-2xl tracking-wide">The Daily DUST</div>
            </div>
            {subtitle && <div className="text-xs text-text-secondary mt-1 font-accent">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-xs text-text-secondary font-accent">Est. 2025 • Week 32</div>
            <ThemeToggle />
            {right}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
