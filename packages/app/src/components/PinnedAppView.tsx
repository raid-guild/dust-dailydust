import { Newspaper, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  closest: { id: string; title: string } | null;
  onOpenArticle: () => void;
  onUnpin: () => void;
  onRefresh: () => void;
  onClose: () => void;
};

export const PinnedAppView: React.FC<Props> = ({
  closest,
  onOpenArticle,
  onUnpin,
  onRefresh,
  onClose,
}) => {
  return (
    <div className="bg-[#f9f7f1] border border-neutral-800 rounded-md shadow-[0_2px_0_0_#111] p-3 w-64">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-neutral-100 border border-neutral-800 grid place-items-center rounded-md p-2">
            <Newspaper className="size-5 text-neutral-800" />
          </div>
          <div className="text-sm">
            {closest ? (
              <button
                onClick={onOpenArticle}
                className={cn("font-heading", "text-sm text-left")}
              >
                {closest.title}
              </button>
            ) : (
              <div className="text-[12px] text-neutral-700">No nearby articles</div>
            )}
          </div>
        </div>
        <div className="flex gap-1 items-center">
          <button
            title="Unpin app"
            onClick={onUnpin}
            className="p-1 border border-neutral-800 rounded-sm bg-neutral-100"
          >
            <X className="size-4 text-neutral-800" />
          </button>
          <button
            title="Refresh"
            onClick={onRefresh}
            className="p-1 border border-neutral-800 rounded-sm bg-neutral-100"
          >
            ⟳
          </button>
          <button
            title="Close"
            onClick={onClose}
            className="p-1 border border-neutral-800 rounded-sm bg-neutral-100"
          >
            <Pin className="size-4 text-neutral-800" />
          </button>
        </div>
      </div>
    </div>
  );
};
