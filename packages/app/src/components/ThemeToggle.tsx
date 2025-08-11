import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("dailydust-theme");
    const initial = saved ?? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
    apply(initial);
  }, []);

  function apply(next: string) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    localStorage.setItem("dailydust-theme", next);
  }

  return (
    <button
      type="button"
      onClick={() => apply(theme === "dark" ? "light" : "dark")}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-neutral-200 bg-panel text-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800"
      title="Toggle theme"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
