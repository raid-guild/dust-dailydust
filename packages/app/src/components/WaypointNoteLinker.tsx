import { useState, useEffect } from "react";
import { useWaypoints, type Waypoint } from "../hooks/useWaypoints";
import { useNotes } from "../hooks/useNotes";
import { useDrafts } from "../hooks/useDrafts";

interface WaypointNoteLinkerProps {
  noteId?: string;
  draftId?: string;
  onClose?: () => void;
}

// Extended waypoint interface that includes note linking
interface ExtendedWaypoint extends Waypoint {
  linkedNoteId?: string;
  linkedDraftId?: string;
}

interface WaypointLink {
  waypointId: string;
  noteId?: string;
  draftId?: string;
  linkedAt: string;
}

export function WaypointNoteLinker({ noteId, draftId, onClose }: WaypointNoteLinkerProps) {
  const { waypoints, addWaypoint } = useWaypoints();
  const { notes } = useNotes();
  const { drafts } = useDrafts();
  const [selectedWaypoints, setSelectedWaypoints] = useState<string[]>([]);
  const [newWaypointName, setNewWaypointName] = useState("");
  const [newWaypointDescription, setNewWaypointDescription] = useState("");
  const [newWaypointCategory, setNewWaypointCategory] = useState("exploration");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [waypointLinks, setWaypointLinks] = useState<WaypointLink[]>([]);

  const currentNote = noteId ? notes.find(n => n.id === noteId) : null;
  const currentDraft = draftId ? drafts.find(d => d.id === draftId) : null;
  const displayTitle = currentNote?.title || currentDraft?.title || "Untitled";

  // Load waypoint links from localStorage
  useEffect(() => {
    const links = localStorage.getItem('dailydust-waypoint-links') || localStorage.getItem('waypoint-links');
    if (links) {
      setWaypointLinks(JSON.parse(links));
      // Migrate on read
      try {
        localStorage.setItem('dailydust-waypoint-links', links);
        localStorage.removeItem('waypoint-links');
      } catch {}
    }
  }, []);

  // Get waypoints with their link status
  const waypointsWithLinks: ExtendedWaypoint[] = waypoints.map((wp: Waypoint) => {
    const link = waypointLinks.find(l => l.waypointId === wp.id);
    return {
      ...wp,
      linkedNoteId: link?.noteId,
      linkedDraftId: link?.draftId
    };
  });

  // Available waypoints (not linked to other notes/drafts, or linked to current note/draft)
  const availableWaypoints = waypointsWithLinks.filter((wp: ExtendedWaypoint) => 
    !wp.linkedNoteId && !wp.linkedDraftId || 
    (noteId && wp.linkedNoteId === noteId) || 
    (draftId && wp.linkedDraftId === draftId)
  );

  // Already linked waypoints for current note/draft
  const linkedWaypoints = waypointsWithLinks.filter((wp: ExtendedWaypoint) => 
    (noteId && wp.linkedNoteId === noteId) || (draftId && wp.linkedDraftId === draftId)
  );

  // Set initially selected waypoints to already linked ones
  useEffect(() => {
    setSelectedWaypoints(linkedWaypoints.map(wp => wp.id));
  }, [waypointLinks, noteId, draftId]);

  const handleToggleWaypoint = (waypointId: string) => {
    setSelectedWaypoints(prev => 
      prev.includes(waypointId) 
        ? prev.filter(id => id !== waypointId)
        : [...prev, waypointId]
    );
  };

  const saveWaypointLinks = (newLinks: WaypointLink[]) => {
    localStorage.setItem('dailydust-waypoint-links', JSON.stringify(newLinks));
    setWaypointLinks(newLinks);
  };

  const handleLinkWaypoints = () => {
    if (!noteId && !draftId) return;

    // Remove existing links for this note/draft
    const filteredLinks = waypointLinks.filter(link => 
      !((noteId && link.noteId === noteId) || (draftId && link.draftId === draftId))
    );

    // Add new links for selected waypoints
    const newLinks: WaypointLink[] = selectedWaypoints.map(waypointId => ({
      waypointId,
      noteId,
      draftId,
      linkedAt: new Date().toISOString()
    }));

    const updatedLinks = [...filteredLinks, ...newLinks];
    saveWaypointLinks(updatedLinks);
    
    const waypointCount = selectedWaypoints.length;
    const waypointText = waypointCount === 1 ? 'waypoint' : 'waypoints';
    setSuccessMessage(`Successfully linked ${waypointCount} ${waypointText}!`);
    
    // Clear success message after 2 seconds
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const handleCreateWaypoint = () => {
    if (newWaypointName.trim()) {
      const newWaypoint = {
        name: newWaypointName,
        description: newWaypointDescription,
        category: newWaypointCategory,
        entityId: "manual_entry" // For manually created waypoints
      };
      
      const createdWaypoint = addWaypoint(newWaypoint);
      
      // Automatically select the new waypoint
      setSelectedWaypoints(prev => [...prev, createdWaypoint.id]);
      
      setSuccessMessage(`Created waypoint "${newWaypointName}" and added to selection!`);
      setTimeout(() => setSuccessMessage(null), 2000);
      
      // Reset form
      setNewWaypointName("");
      setNewWaypointDescription("");
      setNewWaypointCategory("exploration");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-panel rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold text-text-primary">
            Link Waypoints to "{displayTitle}"
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-success/10 border border-success/30 rounded-md p-3">
              <div className="flex items-center">
                <div className="text-success text-sm font-medium">
                  ✓ {successMessage}
                </div>
              </div>
            </div>
          )}

          {/* Currently Linked Waypoints */}
          {linkedWaypoints.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-text-primary mb-3">
                Currently Linked ({linkedWaypoints.length})
              </h3>
              <div className="space-y-2 bg-brand-50 p-3 rounded-lg">
                {linkedWaypoints.map((waypoint: ExtendedWaypoint) => (
                  <div
                    key={waypoint.id}
                    className="flex items-center gap-3 p-2 bg-panel border border-brand-200 rounded"
                  >
                    <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary">{waypoint.name}</div>
                      <div className="text-sm text-text-secondary">
                        {waypoint.description} • {waypoint.category}
                      </div>
                    </div>
                    <span className="text-xs text-brand-700 font-medium">Linked</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Waypoints */}
          <div>
            <h3 className="text-md font-medium text-text-primary mb-3">
              Available Waypoints ({availableWaypoints.length})
            </h3>
            
            {availableWaypoints.length === 0 ? (
              <p className="text-text-secondary text-sm">
                No available waypoints. Create new waypoints below or manage existing ones in the Waypoints tab.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableWaypoints.map((waypoint: ExtendedWaypoint) => {
                  const isSelected = selectedWaypoints.includes(waypoint.id);
                  const isCurrentlyLinked = (noteId && waypoint.linkedNoteId === noteId) || 
                                          (draftId && waypoint.linkedDraftId === draftId);
                  
                  return (
                    <label
                      key={waypoint.id}
                      className={`flex items-center gap-3 p-2 border rounded cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-brand-500 bg-brand-50' 
                          : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleWaypoint(waypoint.id)}
                        className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-text-primary">{waypoint.name}</div>
                          {isCurrentlyLinked && (
                            <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                              Currently Linked
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {waypoint.description} • {waypoint.category}
                        </div>
                        <div className="text-xs text-text-secondary">
                          Entity ID: {waypoint.entityId}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Waypoint */}
          <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
            <h3 className="text-md font-medium text-text-primary mb-3">
              Create New Waypoint
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                value={newWaypointName}
                onChange={(e) => setNewWaypointName(e.target.value)}
                placeholder="Waypoint name..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel text-text-primary"
              />
              
              <textarea
                value={newWaypointDescription}
                onChange={(e) => setNewWaypointDescription(e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel text-text-primary"
              />
              
              <select
                value={newWaypointCategory}
                onChange={(e) => setNewWaypointCategory(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-panel text-text-primary"
              >
                <option value="exploration">Exploration</option>
                <option value="resource">Resource</option>
                <option value="danger">Danger</option>
                <option value="quest">Quest</option>
                <option value="building">Building</option>
                <option value="other">Other</option>
              </select>
              
              <button
                onClick={handleCreateWaypoint}
                disabled={!newWaypointName.trim()}
                className="w-full px-4 py-2 text-sm text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create & Link Waypoint
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
          <div className="text-sm text-text-secondary">
            {selectedWaypoints.length} waypoint(s) selected
            {linkedWaypoints.length > 0 && (
              <span className="ml-2 text-brand-700">
                • {linkedWaypoints.length} currently linked
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary bg-panel border border-neutral-300 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={handleLinkWaypoints}
              className="px-4 py-2 text-sm text-white bg-brand-600 rounded-md hover:bg-brand-700"
            >
              {selectedWaypoints.length === 0 ? 'Unlink All' : `Update Links (${selectedWaypoints.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
