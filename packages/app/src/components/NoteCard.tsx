import { toast } from "sonner";

import { useCopy } from "@/common/useCopy";
import { useDustClient } from "@/common/useDustClient";
import { useWaypoint } from "@/common/useWaypoint";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate, shortenAddress } from "@/utils/helpers";
import { renderMarkdownToHtml } from "@/utils/markdown";
import type { Post } from "@/utils/types";

export const NoteCard = ({ note }: { note: Post }) => {
  const { data: dustClient } = useDustClient();
  const { copyToClipboard } = useCopy();
  const { onSetWaypoint } = useWaypoint();

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
            @{note.author}
          </button>
        </div>
      </div>

      <h3 className={cn("font-heading", "text-lg leading-tight")}>
        {note.title}
      </h3>

      {/* Render note content as markdown with compact styling */}
      <div
        className="text-sm leading-relaxed text-neutral-800 prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{
          __html: renderMarkdownToHtml(
            note.rawContent || note.content[0] || ""
          ),
        }}
      />

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
