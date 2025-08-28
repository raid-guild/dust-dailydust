import { useMemo } from "react";

import { usePosts } from "@/common/usePosts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { uriToHttp } from "@/utils/helpers";

import { SEVEN_DAYS_SECONDS } from "./CollectionWizard";

type CollectionWizardStep3Props = {
  articleIds: string[];
  coverImage: string;
  description: string;
  isEditor: boolean;
  latestEditorPublication: bigint;
  title: string;
};

export const CollectionWizardStep3: React.FC<CollectionWizardStep3Props> = ({
  articleIds,
  coverImage,
  description,
  isEditor,
  latestEditorPublication,
  title,
}) => {
  const { articles } = usePosts();

  const selectedArticles = useMemo(
    () =>
      articles
        .filter((a) => articleIds.includes(a.id))
        // Sort selected articles in the order of articleIds
        .sort((a, b) => articleIds.indexOf(a.id) - articleIds.indexOf(b.id)),
    [articles, articleIds]
  );

  return (
    <div className="space-y-6">
      {isEditor && (
        <div className="bg-yellow-100 border border-yellow-300 p-4 rounded text-yellow-800">
          As an editor, you can publish a new collection to the Front Page once
          every 7 days.
          {latestEditorPublication > BigInt(SEVEN_DAYS_SECONDS) && (
            <div className="mt-1 text-sm text-yellow-700">
              Your last publication was{" "}
              {new Date(
                Number(latestEditorPublication) * 1000
              ).toLocaleDateString()}{" "}
              - you will be able to publish again on{" "}
              {new Date(
                (Number(latestEditorPublication) + SEVEN_DAYS_SECONDS) * 1000
              ).toLocaleDateString()}{" "}
              at{" "}
              {new Date(
                (Number(latestEditorPublication) + SEVEN_DAYS_SECONDS) * 1000
              ).toLocaleTimeString()}
              .
            </div>
          )}
        </div>
      )}
      <Card className="border-neutral-900">
        <CardContent>
          <div className="space-y-3">
            <h3 className={cn("font-heading", "text-lg")}>{title}</h3>
            <p className={"text-neutral-700 text-sm"}>{description}</p>
            {coverImage && (
              <div className="border border-neutral-900 my-4 overflow-hidden">
                <img
                  alt={title}
                  className="duration-500 grayscale hover:grayscale-0 object-cover w-full"
                  src={uriToHttp(coverImage)[0]}
                />
              </div>
            )}
            <div className="space-y-1">
              {selectedArticles.map((article, index) => (
                <div key={article.id} className="text-sm">
                  <span
                    className={cn(
                      "font-accent",
                      "text-neutral-500 text-[10px]"
                    )}
                  >
                    {index === 0 ? "Main Story: " : `Pick ${index}: `}
                  </span>
                  <span>{article.title}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
