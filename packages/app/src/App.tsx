import { useState } from "react";
import { Layout } from "./components/pages/Layout";
import { FrontPage } from "./components/pages/FrontPage";
import { LocalNewsPage } from "./components/pages/LocalNewsPage";
import { BackPage } from "./components/pages/BackPage";
import { DiscoverPage } from "./components/pages/DiscoverPage";
import { EditorRoomPage } from "./components/pages/EditorRoomPage";

export default function App() {
  const [tab, setTab] = useState<"front" | "local" | "back" | "discover" | "editor">("front");

  return (
    <Layout
      subtitle={<span>A DUST Gazette for Blocky Affairs</span>}
      right={
        <nav className="hidden md:flex gap-2">
          {([
            ["FRONT", "front"],
            ["LOCAL", "local"],
            ["BACK", "back"],
            ["DISCOVER", "discover"],
            ["EDITOR", "editor"],
          ] as const).map(([label, id]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1 text-[11px] font-mono rounded border ${
                tab === id
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-neutral-100 border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      }
    >
      <main className="space-y-4">
        {tab === "front" && <FrontPage />}
        {tab === "local" && <LocalNewsPage />}
        {tab === "back" && <BackPage />}
        {tab === "discover" && <DiscoverPage />}
        {tab === "editor" && <EditorRoomPage />}
      </main>
    </Layout>
  );
}
