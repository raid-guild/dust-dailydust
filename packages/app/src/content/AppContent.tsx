import { usePlayerPositionQuery } from "./usePlayerPositionQuery";

export function AppContent() {
  const { data: playerPosition } = usePlayerPositionQuery();

  return (
    <div className="flex flex-col h-screen justify-between">
      <div className="pt-8 px-6 pb-10">
        <h2 className="text-lg font-bold pb-1">Player Position:</h2>
        <div className="flex flex-col gap-2">
          {playerPosition ? (
            <p className="text-black/70">
              X: {playerPosition.x}, Y: {playerPosition.y}, Z:{" "}
              {playerPosition.z}
            </p>
          ) : (
            <p className="text-black/70">Loading position...</p>
          )}
        </div>
      </div>
    </div>
  );
}

