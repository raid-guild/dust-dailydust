import { useState } from "react";

import { useDrafts } from "../hooks/useDrafts";
import { NoteEditor } from "./NoteEditor";
import { NoteList } from "./NoteList";

type View = "list" | "edit" | "create";

interface NotesManagerProps {
  initialEntityId?: string;
}

export function NotesManager({ initialEntityId }: NotesManagerProps) {
  const [currentView, setCurrentView] = useState<View>("list");
  const [editingNoteId, setEditingNoteId] = useState<string | undefined>();
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>();
  const { createDraft } = useDrafts();

  const handleCreateNew = () => {
    // Create a new draft and open editor on it so autosave persists to dailydust-drafts
    const d = createDraft();
    setEditingNoteId(undefined);
    setEditingDraftId(d.id);
    setCurrentView("edit");
  };

  const handleEditNote = (noteId: string) => {
    setEditingNoteId(noteId);
    setEditingDraftId(undefined);
    setCurrentView("edit");
  };

  const handleEditDraft = (draftId: string) => {
    setEditingNoteId(undefined);
    setEditingDraftId(draftId);
    setCurrentView("edit");
  };

  const handleSave = () => {
    setCurrentView("list");
    setEditingNoteId(undefined);
    setEditingDraftId(undefined);
  };

  const handleCancel = () => {
    setCurrentView("list");
    setEditingNoteId(undefined);
    setEditingDraftId(undefined);
  };

  if (currentView === "list") {
    return (
      <NoteList
        onEditNote={handleEditNote}
        onEditDraft={handleEditDraft}
        onCreateNew={handleCreateNew}
      />
    );
  }

  return (
    <NoteEditor
      noteId={editingNoteId}
      draftId={editingDraftId}
      onSave={handleSave}
      onCancel={handleCancel}
      initialEntityId={initialEntityId}
    />
  );
}
