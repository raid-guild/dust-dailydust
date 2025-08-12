import { useCallback, useEffect, useMemo, useState } from "react";
import { NoteEditor } from "./NoteEditor";
import { useWaypoints } from "../hooks/useWaypoints";
import { encodeBlock } from "@dust/world/internal";
import { useDustClient } from "../common/useDustClient";
import type { Abi } from "viem";
import { resourceToHex } from "@latticexyz/common";
import { DUST_NAMESPACE } from "../common/namespace";
import { useDrafts } from "../hooks/useDrafts";

// Minimal ABIs for the systems we call
const noteSystemAbi: Abi = [
  {
    type: "function",
    name: "createNote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "tagsCsv", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateNote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "tagsCsv", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createNoteLink",
    stateMutability: "nonpayable",
    inputs: [
      { name: "noteId", type: "bytes32" },
      { name: "entityId", type: "bytes32" },
      { name: "linkType", type: "uint8" },
      { name: "coordX", type: "int32" },
      { name: "coordY", type: "int32" },
      { name: "coordZ", type: "int32" },
    ],
    outputs: [],
  },
];

const waypointSystemAbi: Abi = [
  {
    type: "function",
    name: "createWaypointGroup",
    stateMutability: "nonpayable",
    inputs: [
      { name: "noteId", type: "bytes32" },
      { name: "groupId", type: "uint16" },
      { name: "name", type: "string" },
      { name: "color", type: "uint24" },
      { name: "isPublic", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "addWaypointStep",
    stateMutability: "nonpayable",
    inputs: [
      { name: "noteId", type: "bytes32" },
      { name: "groupId", type: "uint16" },
      { name: "index", type: "uint16" },
      { name: "x", type: "int32" },
      { name: "y", type: "int32" },
      { name: "z", type: "int32" },
      { name: "label", type: "string" },
    ],
    outputs: [],
  },
];

const NAMESPACE = DUST_NAMESPACE;

function randomBytes32(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  const hex = Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return ("0x" + hex) as `0x${string}`;
}

interface PublishWizardProps {
  // Optional existing draftId to start with
  draftId?: string;
  // Called when publish is completed successfully
  onDone?: () => void;
  // Cancel handler
  onCancel?: () => void;
}

export function PublishWizard({ draftId, onDone, onCancel }: PublishWizardProps) {
  type Step = 1 | 2 | 3;
  const [step, setStep] = useState<Step>(1);

  // Step 1 state from NoteEditor
  const [contentState, setContentState] = useState({
    title: "",
    headerImageUrl: "",
    content: "",
    tags: "",
    category: "Editorial",
    effectiveDraftId: null as string | null,
    noteId: undefined as string | undefined,
  });

  // Step 2: single required location selection
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  // Step 3: route builder
  const { waypoints } = useWaypoints();
  type RouteStep = { waypointId: string; label?: string };
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [addStepWaypointId, setAddStepWaypointId] = useState<string | null>(null);

  // Prefill route with the single location if not already added when moving to Step 3
  useEffect(() => {
    if (step === 3 && selectedWaypointId && routeSteps.length === 0) {
      setRouteSteps([{ waypointId: selectedWaypointId }]);
      setAddStepWaypointId(selectedWaypointId);
    }
  }, [step, selectedWaypointId, routeSteps.length]);

  const canContinueFromStep1 = useMemo(() => {
    return contentState.title.trim().length > 0 && contentState.content.trim().length > 0;
  }, [contentState.title, contentState.content]);

  const canContinueFromStep2 = useMemo(() => !!selectedWaypointId, [selectedWaypointId]);

  const handlePrev = () => setStep((s) => ((Math.max(1, (s as number) - 1)) as Step));
  const handleNext = () => setStep((s) => ((Math.min(3, (s as number) + 1)) as Step));
  const { data: dustClient } = useDustClient();
  const { deleteDraft } = useDrafts();
  const [isPublishing, setIsPublishing] = useState(false);

  const handleDone = async () => {
    if (!canContinueFromStep1) {
      alert("Please complete Content");
      return;
    }
    if (!selectedWaypointId) {
      alert("Please choose a Location");
      return;
    }
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }

    setIsPublishing(true);
    try {
      // Prepare
      const title = contentState.title.trim();
      const body = contentState.content.trim();
      const tagsCsv = contentState.tags.split(',').map((t) => t.trim()).filter(Boolean).join(',');

      // Create or update the note on-chain
      const noteHexId: `0x${string}` = (contentState.noteId && contentState.noteId.startsWith("0x") && contentState.noteId.length === 66)
        ? (contentState.noteId as `0x${string}`)
        : randomBytes32();

      const noteSystemId = resourceToHex({ type: "system", namespace: NAMESPACE, name: "NoteSystem" });

      // If editing (noteId provided), call update; else create
      if (contentState.noteId) {
        await (dustClient as any).provider.request({
          method: "systemCall",
          params: [{ systemId: noteSystemId, abi: noteSystemAbi, functionName: "updateNote", args: [noteHexId, title, body, tagsCsv] }],
        });
      } else {
        await (dustClient as any).provider.request({
          method: "systemCall",
          params: [{ systemId: noteSystemId, abi: noteSystemAbi, functionName: "createNote", args: [noteHexId, title, body, tagsCsv] }],
        });
      }

      // Link the single selected location (anchor)
      const wp = waypoints.find((w) => w.id === selectedWaypointId)!;
      // Ensure a bytes32 entityId; if not present, derive from coordinates
      const hex32 = /^0x[0-9a-fA-F]{64}$/;
      let entityId: `0x${string}`;
      const wx = typeof wp.x === "number" ? Math.trunc(wp.x) : undefined;
      const wy = typeof wp.y === "number" ? Math.trunc(wp.y) : undefined;
      const wz = typeof wp.z === "number" ? Math.trunc(wp.z) : undefined;
      if (hex32.test(wp.entityId)) {
        entityId = wp.entityId as `0x${string}`;
      } else if (wx !== undefined && wy !== undefined && wz !== undefined) {
        entityId = encodeBlock([wx, wy, wz]) as `0x${string}`;
      } else {
        alert("Selected waypoint must have a valid bytes32 entityId or coordinates");
        setIsPublishing(false);
        return;
      }

      const x = (wx ?? 0) as number;
      const y = (wy ?? 0) as number;
      const z = (wz ?? 0) as number;
      await (dustClient as any).provider.request({
        method: "systemCall",
        params: [{
          systemId: noteSystemId,
          abi: noteSystemAbi,
          functionName: "createNoteLink",
          args: [noteHexId, entityId, 0, x, y, z],
        }],
      });

      // Optional Route: create a group and add steps
      if (routeSteps.length > 0) {
        const waypointSystemId = resourceToHex({ type: "system", namespace: NAMESPACE, name: "WaypointSystem" });
        const groupId = 1; // first/only group for this publish flow
        const groupName = "Route";
        const color = 0x3366ff; // uint24
        const isPublic = true;
        await (dustClient as any).provider.request({
          method: "systemCall",
          params: [{ systemId: waypointSystemId, abi: waypointSystemAbi, functionName: "createWaypointGroup", args: [noteHexId, groupId, groupName, color, isPublic] }],
        });

        for (let i = 0; i < routeSteps.length; i++) {
          const s = routeSteps[i];
          const wp2 = waypoints.find((w) => w.id === s.waypointId);
          if (!wp2) continue;
          const x2 = (wp2.x ?? 0) as number;
          const y2 = (wp2.y ?? 0) as number;
          const z2 = (wp2.z ?? 0) as number;
          const label = s.label ?? (wp2.name || `Step ${i + 1}`);
          await (dustClient as any).provider.request({
            method: "systemCall",
            params: [{ systemId: waypointSystemId, abi: waypointSystemAbi, functionName: "addWaypointStep", args: [noteHexId, groupId, i + 1, x2, y2, z2, label] }],
          });
        }
      }

      // Cleanup draft
      const dId = contentState.effectiveDraftId || draftId || null;
      if (dId) {
        try { deleteDraft(dId); } catch {}
      }

      onDone?.();
    } catch (e: any) {
      console.error("Publish failed", e);
      alert("Failed to publish. Check console and try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Stable handler with shallow-equality guard
  const handleEditorState = useCallback((s: {
    title: string;
    headerImageUrl: string;
    content: string;
    tags: string;
    category: string;
    effectiveDraftId: string | null;
    noteId?: string;
  }) => {
    setContentState((prev) => {
      if (
        prev.title === s.title &&
        prev.headerImageUrl === s.headerImageUrl &&
        prev.content === s.content &&
        prev.tags === s.tags &&
        prev.category === s.category &&
        prev.effectiveDraftId === s.effectiveDraftId &&
        prev.noteId === s.noteId
      ) {
        return prev;
      }
      return { ...s, noteId: s.noteId };
    });
  }, []);

  // Helpers for route steps
  const addRouteStep = () => {
    if (!addStepWaypointId) return;
    // Don't duplicate consecutively by default
    setRouteSteps((prev) => [...prev, { waypointId: addStepWaypointId! }]);
  };
  const removeRouteStep = (idx: number) => {
    setRouteSteps((prev) => prev.filter((_, i) => i !== idx));
  };
  const moveRouteStep = (idx: number, dir: -1 | 1) => {
    setRouteSteps((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  };
  const updateRouteStepLabel = (idx: number, label: string) => {
    setRouteSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, label } : s)));
  };

  return (
    <div className="rounded-xl border border-neutral-300 dark:border-neutral-800">
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-[.2em] text-xs text-neutral-500 font-accent">Publish Wizard</span>
          <div className={`px-2 py-1 text-xs rounded-full border ${step === 1 ? 'bg-brand-600 text-white border-brand-600' : 'bg-neutral-100 text-text-secondary border-neutral-300'}`}>1. Content</div>
          <div className={`px-2 py-1 text-xs rounded-full border ${step === 2 ? 'bg-brand-600 text-white border-brand-600' : 'bg-neutral-100 text-text-secondary border-neutral-300'}`}>2. Location</div>
          <div className={`px-2 py-1 text-xs rounded-full border ${step === 3 ? 'bg-brand-600 text-white border-brand-600' : 'bg-neutral-100 text-text-secondary border-neutral-300'}`}>3. Route (optional)</div>
        </div>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button onClick={handlePrev} className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200">Back</button>
          )}
          {step < 3 && (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !canContinueFromStep1) || (step === 2 && !canContinueFromStep2)}
              className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50"
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button onClick={handleDone} disabled={isPublishing} className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50">{isPublishing ? 'Publishing…' : 'Publish'}</button>
          )}
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200">Cancel</button>
        </div>
      </div>

      <div className="p-4">
        {step === 1 && (
          <NoteEditor
            variant="bare"
            draftId={draftId}
            stepperMode
            onStateChange={handleEditorState}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Choose the single location where this story lives.</p>
            <WaypointPicker selectedId={selectedWaypointId} onChange={setSelectedWaypointId} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm text-text-secondary">Optionally define a route/group with multiple stops.</p>

            {/* Add step from existing waypoints */}
            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
              <div className="flex-1">
                <label className="block text-xs text-text-secondary mb-1">Add waypoint</label>
                <select
                  value={addStepWaypointId ?? ''}
                  onChange={(e) => setAddStepWaypointId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-panel"
                >
                  <option value="">Select a waypoint…</option>
                  {waypoints.map((wp) => (
                    <option key={wp.id} value={wp.id}>{wp.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addRouteStep}
                disabled={!addStepWaypointId}
                className="px-4 py-2 text-sm text-white bg-brand-600 rounded-md hover:bg-brand-700 disabled:opacity-50"
              >
                Add Step
              </button>
            </div>

            {/* Steps list */}
            {routeSteps.length === 0 ? (
              <div className="text-sm text-text-secondary">No steps yet. Add waypoints to build a route.</div>
            ) : (
              <ol className="space-y-2">
                {routeSteps.map((s, idx) => {
                  const wp = waypoints.find((w) => w.id === s.waypointId);
                  return (
                    <li key={`${s.waypointId}-${idx}`} className="p-3 rounded border border-neutral-300 dark:border-neutral-800 flex items-start gap-3">
                      <div className="text-xs w-6 h-6 flex items-center justify-center rounded-full bg-brand-600 text-white">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{wp?.name || s.waypointId}</div>
                        <div className="text-xs text-text-secondary truncate">{wp?.entityId}</div>
                        <input
                          value={s.label ?? ''}
                          onChange={(e) => updateRouteStepLabel(idx, e.target.value)}
                          placeholder="Label (optional)"
                          className="mt-2 w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-md bg-panel"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => moveRouteStep(idx, -1)} disabled={idx === 0} className="px-2 py-1 text-xs bg-neutral-100 rounded disabled:opacity-50">↑</button>
                        <button onClick={() => moveRouteStep(idx, 1)} disabled={idx === routeSteps.length - 1} className="px-2 py-1 text-xs bg-neutral-100 rounded disabled:opacity-50">↓</button>
                        <button onClick={() => removeRouteStep(idx)} className="px-2 py-1 text-xs bg-danger/10 text-danger rounded">Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function WaypointPicker({ selectedId, onChange }: { selectedId: string | null; onChange: (id: string | null) => void }) {
  const { waypoints } = useWaypoints();
  return (
    <div className="space-y-2">
      {waypoints.length === 0 ? (
        <div className="text-sm text-text-secondary">No waypoints available. Create one in Waypoint Tools.</div>
      ) : (
        <ul className="space-y-2">
          {waypoints.map((wp) => (
            <li key={wp.id} className={`p-3 rounded border ${selectedId === wp.id ? 'border-brand-500 bg-brand-50' : 'border-neutral-300'}`}>
              <label className="flex items-start gap-3">
                <input
                  type="radio"
                  name="singleLocation"
                  checked={selectedId === wp.id}
                  onChange={() => onChange(wp.id)}
                />
                <div>
                  <div className="font-medium">{wp.name}</div>
                  <div className="text-sm text-text-secondary">{wp.description}</div>
                  <div className="text-xs text-text-secondary">Entity: {wp.entityId}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
