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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Link Waypoints to "{displayTitle}"
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="text-green-800 text-sm font-medium">
                  ✓ {successMessage}
                </div>
              </div>
            </div>
          )}

          {/* Currently Linked Waypoints */}
          {linkedWaypoints.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Currently Linked ({linkedWaypoints.length})
              </h3>
              <div className="space-y-2 bg-blue-50 p-3 rounded-lg">
                {linkedWaypoints.map((waypoint: ExtendedWaypoint) => (
                  <div
                    key={waypoint.id}
                    className="flex items-center gap-3 p-2 bg-white border border-blue-200 rounded"
                  >
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{waypoint.name}</div>
                      <div className="text-sm text-gray-500">
                        {waypoint.description} • {waypoint.category}
                      </div>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Linked</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Waypoints */}
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Available Waypoints ({availableWaypoints.length})
            </h3>
            
            {availableWaypoints.length === 0 ? (
              <p className="text-gray-500 text-sm">
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
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleWaypoint(waypoint.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">{waypoint.name}</div>
                          {isCurrentlyLinked && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Currently Linked
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {waypoint.description} • {waypoint.category}
                        </div>
                        <div className="text-xs text-gray-400">
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
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Create New Waypoint
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                value={newWaypointName}
                onChange={(e) => setNewWaypointName(e.target.value)}
                placeholder="Waypoint name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <textarea
                value={newWaypointDescription}
                onChange={(e) => setNewWaypointDescription(e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <select
                value={newWaypointCategory}
                onChange={(e) => setNewWaypointCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create & Link Waypoint
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedWaypoints.length} waypoint(s) selected
            {linkedWaypoints.length > 0 && (
              <span className="ml-2 text-blue-600">
                • {linkedWaypoints.length} currently linked
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleLinkWaypoints}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {selectedWaypoints.length === 0 ? 'Unlink All' : `Update Links (${selectedWaypoints.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
