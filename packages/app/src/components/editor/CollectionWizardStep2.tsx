import Fuse from "fuse.js";
import { useMemo, useState } from "react";

import { usePosts } from "@/common/usePosts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Post } from "@/utils/types";

type CollectionWizardStep2Props = {
  articleIds: string[];
  canContinueFrom1: boolean;
  onContinue: () => void;
  setArticleIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export const CollectionWizardStep2: React.FC<CollectionWizardStep2Props> = ({
  articleIds,
  canContinueFrom1,
  onContinue,
  setArticleIds,
}) => {
  const { articles } = usePosts();

  const [searchQuery, setSearchQuery] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addArticle = (article: Post) => {
    if (selectedArticles.length < 5) {
      setArticleIds((prev) => [...prev, article.id]);
      setSearchQuery("");
    }
  };

  const removeArticle = (articleId: string) => {
    setArticleIds((prev) => prev.filter((id) => id !== articleId));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newArticles = [...selectedArticles];
    const draggedArticle = newArticles[draggedIndex];
    newArticles.splice(draggedIndex, 1);
    newArticles.splice(dropIndex, 0, draggedArticle);

    setArticleIds(newArticles.map((a) => a.id));
    setDraggedIndex(null);
  };

  const availableArticles = useMemo(
    () => articles.filter((a) => !articleIds.includes(a.id)),
    [articles, articleIds]
  );

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return availableArticles;
    const fuse = new Fuse(availableArticles, {
      keys: ["title", "author"],
      threshold: 0.3,
    });
    return fuse.search(searchQuery).map((result) => result.item);
  }, [availableArticles, searchQuery]);

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
      <Card className="border-neutral-900">
        <CardHeader>
          <CardTitle className={cn("font-heading", "text-xl")}>
            Selected Articles ({selectedArticles.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedArticles.length === 0 ? (
            <p className="text-neutral-500 text-sm">
              No articles selected yet. Search and add articles below.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="border border-neutral-300 cursor-move flex gap-3 hover:bg-neutral-50 items-center p-3 rounded"
                  draggable
                  onDragOver={handleDragOver}
                  onDragStart={() => handleDragStart(index)}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div
                    className={cn(
                      "font-accent",
                      "min-w-[20px] text-neutral-500 text-[10px]"
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className={cn("font-heading", "text-sm")}>
                      {article.title}
                    </h4>
                    <p
                      className={cn(
                        "font-accent",
                        "text-neutral-600 text-[10px]"
                      )}
                    >
                      by {article.author}
                    </p>
                  </div>
                  <Button
                    className="hover:text-red-800 text-red-600"
                    onClick={() => removeArticle(article.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="border-neutral-900">
        <CardHeader>
          <CardTitle className={cn("font-heading", "text-xl")}>
            Add Articles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            className="border-neutral-900"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or author..."
            value={searchQuery}
          />
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="border border-neutral-200 flex gap-3 items-center p-3 rounded"
              >
                <div className="flex-1">
                  <h4 className={cn("font-heading", "text-sm")}>
                    {article.title}
                  </h4>
                  <p
                    className={cn(
                      "font-accent",
                      "text-neutral-600 text-[10px]"
                    )}
                  >
                    by {article.author}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {article.categories?.map((category) => (
                      <Badge
                        key={category}
                        className={cn("font-accent", "px-1 py-0 text-[8px]")}
                        variant="outline"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  className={cn(
                    "font-accent",
                    "cursor-not-allowed text-[10px]"
                  )}
                  disabled={selectedArticles.length >= 5}
                  onClick={() => addArticle(article)}
                  size="sm"
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <button
          disabled={!canContinueFrom1}
          onClick={() => onContinue?.()}
          className="bg-white border border-neutral-900 disabled:opacity-50 hover:bg-neutral-100 px-3 py-1.5 rounded text-sm text-text-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
