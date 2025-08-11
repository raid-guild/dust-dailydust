import { useState } from "react";
import { usePlayerStatus } from "./common/usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";
import { AccountName } from "./common/AccountName";
import { useDustClient } from "./common/useDustClient";
import { WaypointsTab } from "./components/WaypointsTab";
import { NotesManager } from "./components/NotesManager";
import { CollectionsTab } from "./components/CollectionsTab";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  const { data: dustClient } = useDustClient();
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();
  const [activeTab, setActiveTab] = useState<'waypoints' | 'notes' | 'collections'>('waypoints');

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
    <div className="container max-w-6xl mx-auto py-6">
      <header className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-brand-500 via-brand-400 to-brand-500 drop-shadow">
            The Daily Dust
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Hello <AccountName address={dustClient.appContext.userAddress} />! Manage your DUST notes and waypoints
          </p>
        </div>
        <div className="ml-4"><ThemeToggle /></div>
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-6">
        <button
          onClick={() => setActiveTab('waypoints')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'waypoints'
              ? 'text-brand-600 border-brand-600'
              : 'text-text-secondary border-transparent hover:text-text-primary hover:border-neutral-300'
          }`}
        >
          🗺️ Waypoints
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'text-brand-600 border-brand-600'
              : 'text-text-secondary border-transparent hover:text-text-primary hover:border-neutral-300'
          }`}
        >
          📝 Notes
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'collections'
              ? 'text-brand-600 border-brand-600'
              : 'text-text-secondary border-transparent hover:text-text-primary hover:border-neutral-300'
          }`}
        >
          🗂️ Collections
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'waypoints' && <WaypointsTab />}
        {activeTab === 'notes' && <NotesManager />}
        {activeTab === 'collections' && <CollectionsTab />}
      </div>
    </div>
  );
}
