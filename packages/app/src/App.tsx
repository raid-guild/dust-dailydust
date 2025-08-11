import { useState } from "react";
import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import { WaypointsTab } from "./components/WaypointsTab";
import { NotesManager } from "./components/NotesManager";
import { CollectionsTab } from "./components/CollectionsTab";
import { cn } from "./lib/utils";

export default function App() {
  const { data: dustClient } = useDustClient();
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();
  const [activeTab, setActiveTab] = useState<
    "waypoints" | "notes" | "collections"
  >("waypoints");

  if (!dustClient) {
    const url = `https://alpha.dustproject.org?debug-app=${window.location.origin}/dust-app.json`;
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <a href={url} className="text-center text-blue-500 underline">
          Open this page in DUST to connect to dustkit
        </a>
      </div>
    );
  }

  if (!syncStatus.isLive || !playerStatus) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <p className="text-center">Syncing ({syncStatus.percentage}%)...</p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
      <div
        className={cn(
          "rounded-md border border-neutral-900 bg-[#f9f7f1] shadow-[0_6px_0_0_#111] overflow-hidden"
        )}
      >
        <h1
          style={{
            textAlign: "center",
            color: "#1a1a1a",
            marginBottom: "10px",
            fontSize: "2.5rem",
            fontWeight: "bold",
            textShadow:
              "2px 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(76,175,80,0.5)",
            background:
              "linear-gradient(135deg, #4CAF50 0%, #8BC34A 50%, #4CAF50 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "2px",
            borderBottom: "3px solid #4CAF50",
            paddingBottom: "10px",
          }}
        >
          The Daily Dust
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#ffffff",
            fontSize: "1.1rem",
            marginBottom: "30px",
            fontStyle: "italic",
            textShadow:
              "2px 2px 4px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.9)",
          }}
        >
          Hello <AccountName address={dustClient.appContext.userAddress} />!
          Manage your DUST notes and waypoints
        </p>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("waypoints")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "waypoints"
                ? "text-green-600 border-green-600"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🗺️ Waypoints
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "notes"
                ? "text-green-600 border-green-600"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📝 Notes
          </button>
          <button
            onClick={() => setActiveTab("collections")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "collections"
                ? "text-green-600 border-green-600"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🗂️ Collections
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "waypoints" && <WaypointsTab />}
          {activeTab === "notes" && <NotesManager />}
          {activeTab === "collections" && <CollectionsTab />}
        </div>
      </div>
    </main>
  );
}
