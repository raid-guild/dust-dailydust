import { useState } from "react";
import { spawnPlayer } from "./spawnPlayer";

export function Spawn() {
  const [error, setError] = useState<string | undefined>(undefined);
  const [processing, setProcessing] = useState(false);

  const handleSpawn = async () => {
    setError(undefined);
    setProcessing(true);
    const { error } = await spawnPlayer();
    setError(error);
    setProcessing(false);
  };

  return (
    <div className="flex flex-col h-screen justify-between">
      <p className="pt-8 px-6">Hello world!</p>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <button
        className="bg-blue-500 text-white p-2 hover:bg-blue-600 active:bg-blue-700"
        onClick={handleSpawn}
        disabled={processing}
      >
        {processing ? "Spawning..." : "Spawn"}
      </button>
    </div>
  );
}
