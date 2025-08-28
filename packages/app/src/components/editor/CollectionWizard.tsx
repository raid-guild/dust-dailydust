import { encodePlayer } from "@dust/world/internal";
import { resourceToHex } from "@latticexyz/common";
import { useRecord } from "@latticexyz/stash/react";
import { useMutation } from "@tanstack/react-query";
import mudConfig from "contracts/mud.config";
import CollectionSystemAbi from "contracts/out/CollectionSystem.sol/CollectionSystem.abi.json";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Abi } from "viem";

import { useDustClient } from "@/common/useDustClient";
import { usePlayerEntityId } from "@/common/usePlayerEntityId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stash, tables } from "@/mud/stash";

import { CollectionWizardStep1 } from "./CollectionWizardStep1";
import { CollectionWizardStep2 } from "./CollectionWizardStep2";
import { CollectionWizardStep3 } from "./CollectionWizardStep3";

type CollectionWizardProps = {
  onDone: () => void;
  onCancel: () => void;
};

export const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

export const CollectionWizard: React.FC<CollectionWizardProps> = ({
  onDone,
  onCancel,
}) => {
  const { data: dustClient } = useDustClient();
  const { data: playerEntityId } = usePlayerEntityId();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [description, setDescription] = useState("");
  const [articleIds, setArticleIds] = useState<string[]>([]);

  const isEditor =
    useRecord({
      stash,
      table: tables.IsEditor,
      key: { id: playerEntityId ? encodePlayer(playerEntityId) : "0x" },
    })?.value ?? false;

  const latestEditorPublication =
    useRecord({
      stash,
      table: tables.LatestEditorPublication,
      key: {},
    })?.value ?? BigInt(0);

  const createCollection = useMutation({
    mutationFn: ({
      title,
      description,
      coverImage,
      articleIds,
    }: {
      title: string;
      description: string;
      coverImage: string;
      articleIds: string[];
    }) => {
      if (!dustClient) throw new Error("Dust client not connected");
      return dustClient.provider.request({
        method: "systemCall",
        params: [
          {
            systemId: resourceToHex({
              type: "system",
              namespace: mudConfig.namespace,
              name: "CollectionSystem",
            }),
            abi: CollectionSystemAbi as Abi,
            functionName: "createCollection",
            args: [title, description, coverImage, articleIds],
          },
        ],
      });
    },
  });

  const canPublish = useMemo(() => {
    if (!isEditor) return true;
    if (latestEditorPublication === BigInt(0)) return true;
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now - latestEditorPublication >= BigInt(SEVEN_DAYS_SECONDS);
  }, [isEditor, latestEditorPublication]);

  const onPublishCollection = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !description) return;
      if (articleIds.length === 0 || articleIds.length > 5) {
        toast.error("Select between 1 and 5 articles.");
        return;
      }
      if (!canPublish) {
        toast.error("Too early", {
          description: "Editors can publish once every 7 days.",
        });
        return;
      }

      try {
        await createCollection.mutateAsync({
          title,
          description,
          coverImage,
          articleIds,
        });

        setTitle("");
        setDescription("");
        setCoverImage("");
        setArticleIds([]);
        onDone();
        toast.success("Collection Published!");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error publishing collection:", error);

        toast.error("Error Publishing Collection", {
          description: (error as Error).message,
        });
      }
    },
    [
      articleIds,
      canPublish,
      coverImage,
      createCollection,
      description,
      onDone,
      title,
    ]
  );

  const canContinueFrom1 = useMemo(
    () => title.trim().length > 0 && description.trim().length > 0,
    [title, description]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <span className="font-heading">New Collection</span>
            <div
              className={
                step === 1
                  ? "bg-white border border-neutral-900 px-2 py-1 rounded text-text-primary text-xs"
                  : "bg-neutral-100 px-2 py-1 rounded text-text-secondary text-xs"
              }
            >
              1. Details
            </div>
            <div
              className={
                step === 2
                  ? "bg-white border border-neutral-900 px-2 py-1 rounded text-text-primary text-xs"
                  : "bg-neutral-100 px-2 py-1 rounded text-text-secondary text-xs"
              }
            >
              2. Articles
            </div>
            <div
              className={
                step === 3
                  ? "bg-white border border-neutral-900 px-2 py-1 rounded text-text-primary text-xs"
                  : "bg-neutral-100 px-2 py-1 rounded text-text-secondary text-xs"
              }
            >
              3. Preview
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {step > 1 && (
              <button
                className="bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded text-sm"
                onClick={() =>
                  setStep((s) => Math.max(1, (s as number) - 1) as 1 | 2 | 3)
                }
              >
                Back
              </button>
            )}

            {step === 1 && (
              <button
                className="bg-white border border-neutral-900 disabled:opacity-50 hover:bg-neutral-100 px-3 py-1.5 rounded text-sm text-text-primary"
                disabled={!canContinueFrom1}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            )}

            {step === 2 && (
              <button
                className="bg-white border border-neutral-900 disabled:opacity-50 hover:bg-neutral-100 px-3 py-1.5 rounded text-sm text-text-primary"
                disabled={articleIds.length === 0}
                onClick={() => setStep(3)}
              >
                Proceed
              </button>
            )}

            {step === 3 && (
              <button
                className="bg-white border border-neutral-900 hover:bg-neutral-100 px-3 py-1.5 rounded text-sm text-text-primary"
                disabled={createCollection.isPending || !canPublish}
                onClick={onPublishCollection}
              >
                {createCollection.isPending ? "Publishing…" : "Publish"}
              </button>
            )}

            <button
              className="bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded text-sm"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {step === 1 && (
          <CollectionWizardStep1
            canContinueFrom1={canContinueFrom1}
            coverImage={coverImage}
            description={description}
            onContinue={() => setStep(2)}
            setCoverImage={setCoverImage}
            setDescription={setDescription}
            setTitle={setTitle}
            title={title}
          />
        )}

        {step === 2 && (
          <CollectionWizardStep2
            articleIds={articleIds}
            canContinueFrom1={articleIds.length > 0 && articleIds.length <= 5}
            onContinue={() => setStep(3)}
            setArticleIds={setArticleIds}
          />
        )}
        {step === 3 && (
          <CollectionWizardStep3
            articleIds={articleIds}
            coverImage={coverImage}
            description={description}
            isEditor={isEditor}
            latestEditorPublication={latestEditorPublication}
            title={title}
          />
        )}
      </CardContent>
    </Card>
  );
};
