import { useCallback, useEffect, useMemo, useState } from "react";
import { NoteEditor } from "./NoteEditor";
import { useWaypoints, type Waypoint } from "../hooks/useWaypoints";
import { encodeBlock } from "@dust/world/internal";
import { useDustClient } from "../common/useDustClient";
import type { Abi } from "viem";
import { resourceToHex } from "@latticexyz/common";
import { DUST_NAMESPACE } from "../common/namespace";
import { useDrafts } from "../hooks/useDrafts";
import { worldAddress } from "../common/worldAddress";

const INDEXER_Q_URL = "https://indexer.mud.redstonechain.com/q";
// Table names for indexer queries
const TABLE_NOTE_LINK = `${DUST_NAMESPACE}__NoteLink`;
const TABLE_WP_STEP = `${DUST_NAMESPACE}__WaypointStep`;

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
  // Optional existing noteId to edit
  noteId?: string;
  // Called when publish is completed successfully
  onDone?: () => void;
  // Cancel handler
  onCancel?: () => void;
}

export function PublishWizard({ draftId, noteId, onDone, onCancel }: PublishWizardProps) {
  type Step = 1 | 2 | 3;
  const [step, setStep] = useState<Step>(1);

  // Step 1 state from NoteEditor
  const [contentState, setContentState] = useState({
    title: "",
    headerImageUrl: "",
    content: "",
    tags: "",
    category: "Editorial",
    kicker: "",
    effectiveDraftId: null as string | null,
    noteId: undefined as string | undefined,
  });

  const isEditing = useMemo(() => !!(noteId || contentState.noteId), [noteId, contentState.noteId]);

  // Step 2: single required location selection
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  // Step 3: route builder
  const { waypoints, addWaypoint } = useWaypoints();
  type RouteStep = { waypointId: string; label?: string };
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [addStepWaypointId, setAddStepWaypointId] = useState<string | null>(null);

  // Moved up: hooks used by effects below
  const { data: dustClient } = useDustClient();
  const { createDraft, updateDraftImmediate, deleteDraft, getDraft } = useDrafts();
  const [isPublishing, setIsPublishing] = useState(false);
  const [wizardDraftId, setWizardDraftId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  // Hydrate Location and Route when editing a published note by querying the indexer for NoteLink and WaypointStep
  const [hasHydratedFromChain, setHasHydratedFromChain] = useState(false);
  useEffect(() => {
    if (!noteId || hasHydratedFromChain) return;

    let aborted = false;

    const isHex32 = (s: string) => /^0x[0-9a-fA-F]{64}$/.test(s);

    const ensureWaypoint = (entityId: string, x?: number, y?: number, z?: number, name?: string) => {
      const existing = waypoints.find((w) => w.entityId.toLowerCase() === entityId.toLowerCase());
      if (existing) return existing.id;
      // If coords are not provided, can't add a meaningful waypoint; fallback to name only
      const label = name || `Imported ${entityId.slice(0, 10)}…`;
      const w = addWaypoint({
        name: label,
        entityId: entityId as string,
        description: "Imported from chain",
        category: "Imported",
        x: typeof x === "number" ? Math.trunc(x) : undefined,
        y: typeof y === "number" ? Math.trunc(y) : undefined,
        z: typeof z === "number" ? Math.trunc(z) : undefined,
      });
      return w.id;
    };

    async function hydrate() {
      try {
        // Fetch primary location (first NoteLink row for this note)
        const sql1 = `SELECT "entityId","coordX","coordY","coordZ" FROM "${TABLE_NOTE_LINK}" WHERE "noteId"='${noteId}' LIMIT 1`;
        // Fetch all steps for any route group for this note (ordered by group/index)
        const sql2 = `SELECT "groupId","index","x","y","z","label" FROM "${TABLE_WP_STEP}" WHERE "noteId"='${noteId}' ORDER BY "groupId" ASC, "index" ASC`;
        const body = JSON.stringify([
          { query: sql1, address: worldAddress },
          { query: sql2, address: worldAddress },
        ]);
        const res = await fetch(INDEXER_Q_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body });
        if (!res.ok) return;
        const data = await res.json();
        const [noteLinkResult, stepsResult] = (data?.result ?? []) as any[];

        // Parse helper
        const unpack = (result: any): { columns: string[]; rows: any[][] } => {
          if (!Array.isArray(result) || result.length < 2) return { columns: [], rows: [] };
          const [columns, ...rows] = result;
          return { columns, rows } as any;
        };

        // Hydrate location
        const { columns: c1, rows: r1 } = unpack(noteLinkResult);
        if (!aborted && r1[0]) {
          const col = (name: string) => c1.indexOf(name);
          const row = r1[0];
          const entityId = String(row[col("entityId")] ?? "");
          const cx = Number(row[col("coordX")] ?? 0);
          const cy = Number(row[col("coordY")] ?? 0);
          const cz = Number(row[col("coordZ")] ?? 0);
          if (entityId && isHex32(entityId)) {
            const selId = ensureWaypoint(entityId, cx, cy, cz, "Imported Location");
            setSelectedWaypointId(selId);
          }
        }

        // Hydrate route steps
        const { columns: c2, rows: r2 } = unpack(stepsResult);
        if (!aborted && Array.isArray(r2) && r2.length > 0) {
          const col2 = (name: string) => c2.indexOf(name);
          const steps = r2
            .map((row: any) => {
              const x = Number(row[col2("x")] ?? 0);
              const y = Number(row[col2("y")] ?? 0);
              const z = Number(row[col2("z")] ?? 0);
              const label = String(row[col2("label")] ?? "");
              try {
                const eid = encodeBlock([Math.trunc(x), Math.trunc(y), Math.trunc(z)]) as string;
                const wid = ensureWaypoint(eid, x, y, z);
                return { waypointId: wid, label: label || undefined };
              } catch {
                return null;
              }
            })
            .filter(Boolean) as { waypointId: string; label?: string }[];
          if (steps.length > 0) {
            setRouteSteps(steps);
            setAddStepWaypointId(steps[0]!.waypointId);
          }
        }

        if (!aborted) setHasHydratedFromChain(true);
      } catch (e) {
        // ignore failures; user can still select new location/route
        console.warn("Failed to hydrate location/route for note", noteId, e);
      }
    }

    void hydrate();
    return () => {
      aborted = true;
    };
  }, [noteId, waypoints, hasHydratedFromChain, addWaypoint]);

  // When a draftId exists, optionally prefill selectedWaypointId/routeSteps from it in Step 1 mount
  useEffect(() => {
    const id = contentState.effectiveDraftId || wizardDraftId || draftId || null;
    if (!id) return;
    const d = getDraft(id);
    if (!d) return;
    if (selectedWaypointId === null && d.selectedWaypointId) setSelectedWaypointId(d.selectedWaypointId);
    if (routeSteps.length === 0 && Array.isArray(d.routeSteps) && d.routeSteps.length > 0) setRouteSteps(d.routeSteps as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentState.effectiveDraftId, wizardDraftId, draftId]);

  const canContinueFromStep1 = useMemo(() => {
    return contentState.title.trim().length > 0 && contentState.content.trim().length > 0;
  }, [contentState.title, contentState.content]);

  const canContinueFromStep2 = useMemo(() => !!selectedWaypointId, [selectedWaypointId]);

  // Save Draft from wizard (works even in stepperMode)
  const handleSaveDraft = () => {
    const payload = {
      title: contentState.title,
      headerImageUrl: contentState.headerImageUrl,
      content: contentState.content,
      tags: contentState.tags,
      category: contentState.category,
      kicker: contentState.kicker,
      selectedWaypointId,
      routeSteps,
    } as const;

    let id = contentState.effectiveDraftId || wizardDraftId || draftId || null;
    if (!id) {
      const d = createDraft(payload as any);
      id = d.id;
      setWizardDraftId(d.id);
    } else {
      updateDraftImmediate(id, payload as any);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

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
      const tagsCsv = contentState.tags.split(",").map((t) => t.trim()).filter(Boolean).join(",");

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
      const dId = contentState.effectiveDraftId || wizardDraftId || draftId || null;
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
    kicker: string;
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
        prev.kicker === s.kicker &&
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
            <button onClick={() => setStep((s) => ((Math.max(1, (s as number) - 1)) as Step))} className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200">Back</button>
          )}
          {/* Save Draft available on all steps unless editing an existing note */}
          {!isEditing && (
            <button onClick={handleSaveDraft} className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200">
              {justSaved ? 'Saved' : 'Save Draft'}
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => setStep((s) => ((Math.min(3, (s as number) + 1)) as Step))}
              disabled={(step === 1 && !canContinueFromStep1) || (step === 2 && !canContinueFromStep2)}
              className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50"
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button onClick={handleDone} disabled={isPublishing} className="px-3 py-1.5 text-sm text-white bg-brand-600 rounded disabled:opacity-50">{isPublishing ? 'Publishing…' : (isEditing ? 'Update' : 'Publish')}</button>
          )}
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary bg-neutral-100 rounded hover:bg-neutral-200">Cancel</button>
        </div>
      </div>

      <div className="p-4">
        {step === 1 && (
          <NoteEditor
            variant="bare"
            draftId={draftId || wizardDraftId || undefined}
            noteId={noteId}
            stepperMode
            onStateChange={handleEditorState}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Choose the single location where this story lives.</p>
            <WaypointPicker waypoints={waypoints} selectedId={selectedWaypointId} onChange={setSelectedWaypointId} />
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

function WaypointPicker({ waypoints, selectedId, onChange }: { waypoints: Waypoint[]; selectedId: string | null; onChange: (id: string | null) => void }) {
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
