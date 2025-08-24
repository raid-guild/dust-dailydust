import { getRecord } from "@latticexyz/stash/internal";
import { useEffect, useState } from "react";

import { stash, tables } from "@/mud/stash";

export const useCategories = () => {
  const [articleCategories, setArticleCategories] = useState<string[]>([]);
  const [noteCategories, setNoteCategories] = useState<string[]>([]);

  useEffect(() => {
    const _articleCategories = (getRecord({
      stash,
      table: tables.ArticleCategories,
      key: {},
    })
      ?.value?.map((c) => {
        return getRecord({
          stash,
          table: tables.Category,
          key: { id: c },
        })?.value;
      })
      .filter((c): c is string => !!c) ?? []) as string[];

    const _noteCategories = (getRecord({
      stash,
      table: tables.NoteCategories,
      key: {},
    })
      ?.value?.map((c) => {
        return getRecord({
          stash,
          table: tables.Category,
          key: { id: c },
        })?.value;
      })
      .filter((c): c is string => !!c) ?? []) as string[];

    setArticleCategories(_articleCategories);
    setNoteCategories(_noteCategories);
  }, []);

  return {
    articleCategories,
    noteCategories,
  };
};
