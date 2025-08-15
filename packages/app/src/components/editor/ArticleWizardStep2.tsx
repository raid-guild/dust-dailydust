import { useENS } from "@/common/useENS";

interface Props {
  coverImage: string;
  title: string;
  content: string;
  anchorPos: { x: number; y: number; z: number } | null;
  renderMarkdownToHtml: (md: string) => string;
  authorAddress?: string | undefined;
  category?: string;
}

export default function ArticleWizardStep2({
  coverImage,
  title,
  content,
  anchorPos,
  renderMarkdownToHtml,
  authorAddress,
  category,
}: Props) {
  const ens = useENS(authorAddress as any);
  const authorDisplay =
    ens?.data?.displayName ?? ens?.data?.name ??
    (authorAddress ? `@${authorAddress.slice(0, 6)}` : "anonymous");
  console.log("ArticleWizardStep2", {
    authorAddress,
    authorDisplay,
    ens,
    category, 
    coverImage,
  });

  return (
    <div className="max-h-[60vh] overflow-y-auto bg-panel border border-neutral-200 rounded p-4">
      <header className="grid gap-3">
        <div className={"font-accent text-[10px] text-neutral-700 uppercase tracking-widest"}>
          Draft
        </div>
        <h1 className={"font-heading text-2xl leading-tight"}>{title || "Untitled"}</h1>
        <div className="font-accent text-[10px] text-neutral-700">{`By ${authorDisplay}`}</div>
        {category && (
          <div className="mt-1">
            <span className="font-accent bg-neutral-100 border border-neutral-900 px-2 py-1 rounded-[3px] text-[10px] tracking-wider uppercase">
              {category}
            </span>
          </div>
        )}
      </header>

      {coverImage ? (
        <div className="border border-neutral-900 my-4 overflow-hidden">
          <img
            alt={title}
            className="grayscale object-cover w-full"
            src={coverImage}
          />
        </div>
      ) : null}

      <div className={"mt-2 prose max-w-none text-[16px] text-neutral-900 leading-relaxed bg-panel"}>
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }} />
      </div>

      <footer className="border-neutral-900 border-t flex flex-wrap gap-3 items-center justify-between mt-6 pt-3">
        <div className={"font-accent text-[10px] text-neutral-700"}>
          {anchorPos
            ? `${"Preview anchor"} • x:${anchorPos.x} y:${anchorPos.y} z:${anchorPos.z}`
            : "No anchor"}
        </div>
      </footer>
    </div>
  );
}
