import { Newspaper, Pin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";

import { cn } from "@/lib/utils";
import {
  BACK_PAGE_PATH,
  DISCOVER_PAGE_PATH,
  EDITOR_PAGE_PATH,
  FRONT_PAGE_PATH,
  LOCAL_PAGE_PATH,
} from "@/Routes";
import { PinnedApp } from "@/components/PinnedApp";

const nav = [
  { href: FRONT_PAGE_PATH, label: "Front Page" },
  { href: LOCAL_PAGE_PATH, label: "Local" },
  { href: BACK_PAGE_PATH, label: "Back Page" },
  { href: DISCOVER_PAGE_PATH, label: "Discover" },
  { href: EDITOR_PAGE_PATH, label: "Editor Room" },
];

export const Masthead = () => {
  const [pinned, setPinned] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const val = localStorage.getItem("pinnedApp");
      if (val === "true") setPinned(true);
    } catch (e) {
      // ignore
    }
  }, []);

  const togglePin = useCallback(() => {
    setPinned((prev) => {
      const next = !prev;
      setOpen(next);
      try {
        localStorage.setItem("pinnedApp", next ? "true" : "false");
      } catch (e) {}
      try { console.log && console.log('[Masthead] togglePin', { prev, next }); } catch (e) {}
      return next;
    });
  }, []);

  useEffect(() => {
    try { console.log && console.log('[Masthead] open changed', { open }); } catch (e) {}
  }, [open]);

  const handleClose = useCallback(() => setOpen(false), []);

  const handleUnpin = useCallback(() => {
    setPinned(false);
    setOpen(false);
    try {
      localStorage.setItem("pinnedApp", "false");
    } catch (e) {}
  }, []);

  return (
    <header className="sticky top-0 z-30">
      <div className="max-w-6xl mx-auto pt-6 px-4 w-full">
        <div className="bg-[#f9f7f1] border border-neutral-800 rounded-md shadow-[0_2px_0_0_#111]">
          <div className="bg-neutral-50/50 border-b border-neutral-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-3 items-center">
                <div className="bg-neutral-100 border border-neutral-800 grid place-items-center rounded-md size-9">
                  <Newspaper className="size-5 text-neutral-800" />
                </div>
                <div>
                  <div
                    className={cn(
                      "font-heading",
                      "sm:text-3xl text-2xl tracking-wide select-none"
                    )}
                  >
                    The Daily DUST
                  </div>
                  <div
                    className={cn(
                      "font-accent",
                      "mt-1 text-[10px] leading-none text-neutral-700"
                    )}
                  >
                    A DUST Gazette for Blocky Affairs
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  "font-accent",
                  "hidden sm:block text-[10px] text-neutral-700"
                )}
              >
                <div className="flex items-center gap-2">
                  {"Est. 2025 • Week 32"}
                  <button
                    title={pinned ? "Unpin app" : "Pin app"}
                    onClick={() => togglePin()}
                    className="p-1 border border-neutral-800 rounded-sm bg-neutral-100"
                  >
                    <Pin className="size-4 text-neutral-800" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 px-3 py-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "font-accent",
                  "bg-neutral-100 border border-neutral-800 hover:bg-neutral-200 px-2 py-1 rounded-[3px] text-[10px] tracking-wider uppercase"
                )}
                to={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Pinned app mount */}
      {open && (
        <PinnedApp open={open} onClose={handleClose} onUnpin={handleUnpin} />
      )}
    </header>
  );
};
