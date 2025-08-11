import { NoteEditor } from "../NoteEditor";
import { WaypointsTab } from "../WaypointsTab";
import { CollectionsTab } from "../CollectionsTab";

export function EditorRoomPage() {
  return (
    <section className="rounded-xl bg-panel border border-neutral-200 dark:border-neutral-800 p-6 space-y-6">
      {/* Submit New Content */}
      <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
        <h2 className="font-serif text-2xl mb-3">Submit New Content</h2>
        <NoteEditor variant="bare" />
      </div>

      {/* Collections Manager */}
      <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
        <h2 className="font-serif text-2xl mb-3">Collections</h2>
        <CollectionsTab />
      </div>

      {/* Waypoint Tools */}
      <div className="rounded-xl border border-neutral-300 dark:border-neutral-800 p-4">
        <h2 className="font-serif text-2xl mb-3">Waypoint Tools</h2>
        <WaypointsTab />
      </div>
    </section>
  );
}
