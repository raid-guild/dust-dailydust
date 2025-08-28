import { Jimp } from "jimp";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { uriToHttp } from "@/utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE;

type CollectionWizardStep1Props = {
  canContinueFrom1: boolean;
  coverImage: string;
  description: string;
  onContinue: () => void;
  setCoverImage: React.Dispatch<React.SetStateAction<string>>;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  title: string;
};

export const CollectionWizardStep1: React.FC<CollectionWizardStep1Props> = ({
  canContinueFrom1,
  coverImage,
  description,
  onContinue,
  setCoverImage,
  setDescription,
  setTitle,
  title,
}) => {
  const uploadImageToIpfs = async (file: File, name: string) => {
    if (!API_BASE) throw new Error("API_BASE is not defined");

    // Using Jimp to resize the image and convert to a PNG
    const buffer = await file.arrayBuffer();
    const image = await Jimp.read(buffer);
    const targetW = Math.min(1000, image.bitmap.width);
    const pngBuffer = (await image
      .resize({ w: targetW }) // don't upscale
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
      <div>
        <label
          className={cn("font-accent", "text-[10px]")}
          htmlFor="collection-title-input"
        >
          Collection Title
        </label>
        <Input
          id="collection-title-input"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Amazing Collection Title"
          value={title}
        />
      </div>
      {API_BASE && (
        <div>
          <label
            className={cn("font-accent", "text-[10px]")}
            htmlFor="collection-cover-image-input"
          >
            Cover Image
          </label>
          <input
            id="collection-cover-image-input"
            accept="image/png, image/jpeg, image/jpg"
            className="text-sm w-full"
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

                    toast.error("Failed to Upload", {
                      description: (err as Error).message,
                    });
                  });
              }
            }}
            type="file"
          />
        </div>
      )}

      {coverImage && (
        <img
          alt="Cover Preview"
          className="h-auto rounded w-full"
          src={uriToHttp(coverImage)[0]}
        />
      )}

      <input
        className="border border-neutral-200 px-2 py-1 rounded text-sm bg-panel w-full"
        onChange={(e) => setCoverImage(e.target.value)}
        placeholder="Cover image URL (optional) - tip: F2 in game to grab screenshot"
        value={coverImage}
      />

      <div className="space-y-2">
        <label
          className={cn("font-accent", "text-[10px]")}
          htmlFor="collection-description-textarea"
        >
          Description
        </label>

        <textarea
          id="collection-description-textarea"
          className="bg-transparent border border-neutral-200 h-20 p-2 rounded text-sm w-full"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write your collection description..."
          value={description}
        />

        <div className="flex gap-2">
          <button
            className="bg-white border border-neutral-900 disabled:opacity-50 hover:bg-neutral-100 px-3 py-1.5 rounded text-sm text-text-primary"
            disabled={!canContinueFrom1}
            onClick={() => onContinue()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};
