import { encodeBlock } from "@dust/world/internal";
import { getRecord } from "@latticexyz/stash/internal";
import { useMemo } from "react";
import { toast } from "sonner";
import { hexToString, zeroAddress } from "viem";

import { useCopy } from "@/common/useCopy";
import { useDustClient } from "@/common/useDustClient";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stash, tables } from "@/mud/stash";
import { formatDate, shortenAddress } from "@/utils/helpers";
import type { Post } from "@/utils/types";

export const NoteCard = ({ note }: { note: Post }) => {
  const { data: dustClient } = useDustClient();
  const { copyToClipboard } = useCopy();

  // Set waypoint for an note by encoding its block coords into an EntityId
  const onSetWaypoint = async (note: Post) => {
    if (!dustClient) {
      alert("Wallet/client not ready");
      return;
    }

    const coords = note.coords;
    if (!coords || typeof coords.x !== "number") {
      alert("Note has no anchor/coordinates to set a waypoint for");
      return;
    }

    try {
      const bx = Math.floor(coords.x);
      const by = Math.floor(coords.y);
      const bz = Math.floor(coords.z);
      const entityId = encodeBlock([bx, by, bz]);

      await dustClient.provider.request({
        method: "setWaypoint",
        params: { entity: entityId, label: note.title || "Waypoint" },
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Failed to set waypoint", e);
      alert("Failed to set waypoint");
    }
  };

  const author = useMemo(() => {
    const ownerUsername = getRecord({
      stash,
      table: tables.PlayerName,
      key: { player: (note?.owner ?? zeroAddress) as `0x${string}` },
    })?.name;

    if (ownerUsername) {
      return hexToString(ownerUsername).replace(/\0+$/, "");
    }
    return "Anonymous";
  }, [note?.owner]);

  return (
    <div
      key={note.id}
      className="border border-neutral-900 bg-neutral-50 p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        {note.categories[0] && (
          <Badge
            className={cn(
              "heading-accent",
              "text-[9px] uppercase tracking-wider"
            )}
          >
            {note.categories[0]}
          </Badge>
        )}
        <div
          className={cn(
            "font-accent",
            "text-[9px] text-neutral-600 uppercase tracking-wider"
          )}
        >
          {"By "}
          <button
            onClick={() => {
              copyToClipboard(note.owner);
              toast.success(`Copied ${shortenAddress(note.owner)}`);
            }}
          >
            @{author}
          </button>
        </div>
      </div>

      <h3 className={cn("font-heading", "text-lg leading-tight")}>
        {note.title}
      </h3>

      <p className={"text-sm leading-relaxed text-neutral-800"}>
        {note.content[0]}
      </p>

      <div className="align-start flex flex-col space-y-1 text-xs pt-2 border-t border-neutral-300">
        {note.coords && (
          <span
            className={cn(
              "font-accent",
              "text-[9px] text-neutral-600 uppercase tracking-wider"
            )}
          >
            x:{note.coords.x} y:{note.coords.y} z:{note.coords.z}
          </span>
        )}
        {dustClient && (
          <div>
            <button
              onClick={() => onSetWaypoint(note)}
              className="underline"
              disabled={!dustClient}
            >
              Set Waypoint
            </button>
          </div>
        )}
        <span
          className={cn(
            "heading-accent",
            "text-[9px] text-neutral-600 uppercase tracking-wider"
          )}
        >
          {formatDate(note.createdAt)}
        </span>
      </div>
    </div>
  );
};
