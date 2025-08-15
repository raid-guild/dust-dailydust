import { Jimp } from "jimp";

import { cn } from "@/lib/utils";
import { uriToHttp } from "@/utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE;

interface Props {
  title: string;
  setTitle: (v: string) => void;
  coverImage: string;
  setCoverImage: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  articleCategories: string[];
  applyFormatting: (action: "h1" | "h2" | "h3" | "bold" | "italic") => void;
  content: string;
  setContent: (v: string) => void;
  handleSaveDraft: () => void;
  canContinueFrom1: boolean;
  justSaved: boolean;
  onContinue?: () => void;
}

export default function ArticleWizardStep1({
  title,
  setTitle,
  coverImage,
  setCoverImage,
  category,
  setCategory,
  articleCategories,
  applyFormatting,
  content,
  setContent,
  handleSaveDraft,
  canContinueFrom1,
  justSaved,
  onContinue,
}: Props) {
  const uploadImageToIpfs = async (file: File, name: string) => {
    if (!API_BASE) throw new Error("API_BASE is not defined");

    // Using Jimp to resize the image and convert to a PNG
    const buffer = await file.arrayBuffer();
    const image = await Jimp.read(buffer);
    const pngBuffer = (await image
      .resize({ w: 1000 })
      .getBuffer("image/png")) as BlobPart;

    const form = new FormData();
    form.append("file", new File([pngBuffer], name, { type: "image/png" }));
    if (name) form.append("name", name);

    const resp = await fetch(`${API_BASE}/ipfs/file`, {
      method: "POST",
      body: form,
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${resp.status}`);
    }

    return resp.json() as Promise<{
      cid: string;
      size: number;
      created_at: string;
    }>;
  };

  return (
    <div className="space-y-3">
      {API_BASE && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-xl font-semibold border-none outline-none bg-transparent"
          />
          <input
            accept="image/png, image/jpeg, image/jpg"
            className="bg-panel border border-neutral-200 px-2 py-1 rounded text-sm w-full"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadImageToIpfs(file, file.name)
                  .then((res) => {
                    setCoverImage(`ipfs://${res.cid}`);
                  })
                  .catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error("Failed to upload image:", err);
                  });
              }
            }}
            type="file"
          />
        </>
      )}

      {coverImage && (
        <img
          alt="Cover Preview"
          className="h-auto rounded w-full"
          src={uriToHttp(coverImage)[0]}
        />
      )}

      <input
        value={coverImage}
        onChange={(e) => setCoverImage(e.target.value)}
        placeholder="Cover image URL (optional) tip: F2 in game to grab screenshot"
        className="w-full text-sm border border-neutral-200 rounded px-2 py-1 bg-panel"
      />

      <select
        id="article-category-select"
        aria-label="Type"
        className={cn(
          "border-input bg-transparent border border-neutral-900",
          "h-9 w-full rounded-md px-3 py-1 text-base shadow-xs",
          "transition-[color,box-shadow] outline-none",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "md:text-sm"
        )}
        onChange={(e) => setCategory(e.target.value)}
        value={category}
      >
        {articleCategories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Markdown toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyFormatting("h1")}
          className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("h2")}
          className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("h3")}
          className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("bold")}
          className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => applyFormatting("italic")}
          className="px-2 py-1 text-xs bg-neutral-100 rounded hover:bg-neutral-200"
        >
          Italic
        </button>
      </div>

      <textarea
        id="article-content-textarea"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your article in markdown..."
        className="w-full h-80 p-2 text-sm border border-neutral-200 rounded bg-transparent"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSaveDraft}
          className="px-3 py-1.5 text-sm bg-neutral-100 rounded hover:bg-neutral-200"
        >
          {justSaved ? "Saved" : "Save Draft"}
        </button>
        <button
          disabled={!canContinueFrom1}
          onClick={() => onContinue?.()}
          className="px-3 py-1.5 text-sm bg-white text-text-primary border border-neutral-900 rounded hover:bg-neutral-100 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
