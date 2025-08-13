# Internal Query API (App-only)

This layer centralizes read queries to the MUD indexer, exposes typed functions, and provides React Query hooks for caching. It is internal to the app; not a public API.

## Structure

- `src/api/`
  - `dustIndexer.ts` – low-level indexer client: `runSql`, `sql` helpers
  - `types.ts` – source-of-truth types (OnchainNote, Route, etc.)
  - `notes.ts` – pure query functions for notes (no React)
  - `routes.ts` – pure query functions for waypoint groups/steps
- `src/api/hooks/`
  - `useNotesQuery.ts` – hooks wrapping `notes.ts`
  - `useRoutesQuery.ts` – hooks wrapping `routes.ts`

Existing hooks `useOnchainNotes` and `usePublishedNotes` now delegate to this API for backward compatibility.

## Types

Located in `src/api/types.ts`:
- `OnchainNote` – normalized onchain note
- `NotesListFilters` – owner, tags, date range, boostedOnly, search
- `Pagination` – limit, offset
- `WaypointGroup`, `WaypointStep`, `Route`

## Hooks usage

List notes with filters and pagination:

```tsx
import { useNotesList } from "../api/hooks/useNotesQuery";

const { data: notes, isLoading, error } = useNotesList(
  { owner, tags: ["raidguild"], boostedOnly: false, search: "forge" },
  { limit: 50, offset: 0 }
);
```

Get a single note by id:

```tsx
import { useNote } from "../api/hooks/useNotesQuery";
const { data: note } = useNote(noteId);
```

Notes near coordinates (uses WaypointStep table):

```tsx
import { useNotesNear } from "../api/hooks/useNotesQuery";
const { data: nearby } = useNotesNear({ x, y, z, radius: 20, limit: 100, offset: 0 });
```

Boosted and trending notes:

```tsx
import { useBoostedNotes, useTrendingNotes } from "../api/hooks/useNotesQuery";
const { data: boosted } = useBoostedNotes(50);
const { data: trending } = useTrendingNotes(50);
```

Routes for a note (waypoint groups + ordered steps):

```tsx
import { useRoutesForNote } from "../api/hooks/useRoutesQuery";
const { data: routes } = useRoutesForNote(noteId);
```

## Calling API functions directly

Pure functions (no React) are exported from `src/api/notes.ts` and `src/api/routes.ts`:
- `listNotes(filters, pagination)`
- `getNoteById(noteId)`
- `listNotesNear({ x, y, z, radius }, pagination)`
- `listNotesByOwner(owner, pagination)`
- `listBoosted(limit)`
- `listTrending(limit)`
- `listNotesWithRouteMeta(pagination)`
- `getRoutesForNote(noteId)`

Use hooks for UI; call these directly for non-UI tasks.

## Caching and keys

Hooks use TanStack Query v5 via `src/common/Providers.tsx`:
- Keys: `["notes", filters, { limit, offset }]`, `["note", id]`, `["notes","near", params]`, `["routes", noteId]`
- `staleTime` tuned per hook, `keepPreviousData` for paging

## Adding a new query

1) Implement in `src/api/notes.ts` or `src/api/routes.ts` using `runSql` and `sql` helpers.
- Centralize SELECT columns; reuse `mapNoteRow` when possible.
- NEVER interpolate raw user input; use `sql.str`, `sql.num`, `sql.ident`, etc.

2) Create a hook in `src/api/hooks/` that wraps it with `useQuery`.
- Choose a descriptive query key.
- Add `staleTime` and `enabled` guards as needed.

Example: notes by tag and date

```ts
// src/api/notes.ts
export async function listNotesByTag(tag: string, pager: Pagination = {}) {
  return listNotes({ tags: [tag] }, pager);
}
```

```ts
// src/api/hooks/useNotesQuery.ts
export function useNotesByTag(tag?: string, pager: Pagination = {}) {
  return useQuery({
    queryKey: ["notes","tag", tag, pager],
    queryFn: tag ? () => notesApi.listNotesByTag(tag, pager) : undefined,
    enabled: Boolean(tag),
  });
}
```

## Configuration

- Indexer URL: `src/api/dustIndexer.ts` (INDEXER_Q_URL)
- World address: `src/common/worldAddress.ts`
- Namespace/table names: `src/common/namespace.ts`

## Migration notes

- Prefer `useNotesList`/`useNote` instead of ad-hoc fetches.
- `useOnchainNotes` and `usePublishedNotes` are thin wrappers; you can migrate components to `useNotesList` directly.
- Replace any remaining `fetch(INDEXER_Q_URL, ...)` with `runSql`.

## Errors

- `runSql` throws on non-OK responses; hooks surface `error` for UI handling.
- Row mapping normalizes tags from array or JSON-string to `string[]`.

## Gotchas

- Tags column can be array or JSON string; matching uses `ILIKE` fallback.
- Coordinates in `listNotesNear` use inclusive bounds on `WaypointStep.x/y/z`.
- Use `hex32` helper for bytes32 ids.
