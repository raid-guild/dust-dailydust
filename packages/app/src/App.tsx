import { Spawn } from "./spawn";
import { AppContent } from "./content";
import { usePlayerStatus } from "./usePlayerStatus";
import { useSyncStatus } from "./mud/useSyncStatus";

export default function App() {
  const syncStatus = useSyncStatus();
  const playerStatus = usePlayerStatus();

  if (!syncStatus.isLive || !playerStatus) {
    return (
      <div className="flex flex-col h-screen justify-between">
        <p className="pt-8 px-6">
          <br />
          Syncing ({syncStatus.percentage}%)...
        </p>
      </div>
    );
  }

  return playerStatus === "dead" ? <Spawn /> : <AppContent />;
}
