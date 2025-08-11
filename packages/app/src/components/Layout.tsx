import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Masthead } from "./Masthead";

export const Layout = ({ children }: { children: ReactNode }) => {
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
      <Masthead />
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
};
