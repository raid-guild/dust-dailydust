

## DailyDustNotes

**Notion-style notes + waypoints for the Dust world**

DustNotes is a lightweight world-building and navigation tool that lets players create, share, and discover rich markdown notes with optional waypoint routes. Notes can be **global** (visible anywhere) or **local** (linked to an in-world entity like a sign, force field, or landmark).

Players can:

* ✍ **Create** markdown notes with tags and optional waypoint groups (for tours, quests, or directions).
* 📍 **Attach** notes to any in-world entity for context-specific content.
* 🧭 **Follow** waypoint routes directly from a note for guided experiences.
* 💾 **Save drafts locally** before publishing on-chain.
* 💸 **Tip** note creators or **Boost** notes into a Featured section for increased visibility.
* 🔎 **Browse** notes nearby, globally, or in curated/featured feeds.

**Use cases:**

* Walking tours of player-built cities.
* Quest instructions and treasure hunts.
* City bulletin boards with news, rules, or event info.
* Curated travel guides between settlements using waypoint groups.
* Tips & strategy notes linked to chests, farms, or PvP arenas.

**Why it’s important**
DustNotes provides a foundational content layer for the Dust world. By blending player-created guides with spatial context, it becomes a **public knowledge network**—one that can later plug into future systems like automated tours, quests, or in-game governance boards.

---


# Product: DustNotes (Notion-style notes + waypoint routes)

## Core user stories (MVP)

1. **Create a note** with markdown and tags (`global`, `local`, `quest`, etc.).
2. **Attach waypoint groups** (ordered steps, labels, colors) to a note.
3. **Optionally link a note to an in-world entity** (e.g., a Sign at XYZ, ForceField, Chest).
4. **Browse notes**:

   * Nearby (entity/position context),
   * Global (latest/top),
   * Featured/Boosted (paid spotlight).
5. **Tip / Boost** a note:

   * Tip: send tokens to the note’s tip jar (creator owned).
   * Boost: pay a fee to send the note to a **Featured** section for a timed window.
6. **Local draft mode** (autosave to localStorage). Publish when ready.
7. **Import/export waypoint groups** (JSON) so it composes with your existing waypoint manager.

---

# On-chain data model (MUD tables)

> Names are suggestions—feel free to tweak field sizes to your chain budget.

### `Note`

* `noteId: bytes32` **(key)**
* `owner: address`
* `title: string`
* `content: string`  *(markdown; for hackathon keep under \~4–8 KB)*
* `tags: string[]`  *(encode as CSV or bytes\[] if you prefer)*
* `createdAt: uint64`
* `updatedAt: uint64`
* `tipJar: address` *(defaults to owner; editable)*
* `boostUntil: uint64` *(block timestamp—> featured until this time; 0 if not boosted)*
* `arweaveHash: bytes32` *(optional v2)*

### `NoteLink`

> Lets any note be “anchored” to **any entity** (signs, FFs, chests, player, whatever).

* `noteId: bytes32` **(key part 1)**
* `entityId: bytes32` **(key part 2)**
* `linkType: uint8` *(0=anchor, 1=mirror, 2=embed, etc.)*
* `coordX: int32` *(optional; cache world XYZ if relevant)*
* `coordY: int32`
* `coordZ: int32`

### `WaypointGroup`

> A note can have multiple groups (e.g., “City Tour”, “Treasure Route”).

* `noteId: bytes32` **(key part 1)**
* `groupId: uint16` **(key part 2)**
* `name: string`
* `color: uint24` *(UI hint)*
* `isPublic: bool`

### `WaypointStep`

* `noteId: bytes32` **(key part 1)**
* `groupId: uint16` **(key part 2)**
* `index: uint16` **(key part 3)**
* `x: int32`
* `y: int32`
* `z: int32`
* `label: string`

> If you want to save gas/time, store steps as a packed bytes blob per group for MVP; but per-step rows are nicer for composability.

---

# Systems (contracts)

### `NoteSystem`

* `createNote(title, content, tags[], tipJar?) -> noteId`
* `updateNote(noteId, title?, content?, tags?)`
* `setTipJar(noteId, tipJar)`
* `linkNote(noteId, entityId, linkType, coord?)`
* `unlinkNote(noteId, entityId)`
* `boostNote(noteId, duration, token, amount)`

  * Minimal: accept native ETH (or a single ERC20) → set `boostUntil = now + duration`.
  * Treasury address is configurable; emits event for indexer/UI.

### `WaypointSystem`

* `setWaypointGroup(noteId, groupId, name, color, isPublic)`
* `clearWaypointGroup(noteId, groupId)` *(wipe steps)*
* `addWaypointStep(noteId, groupId, index, x, y, z, label)`
* `removeWaypointStep(noteId, groupId, index)`
* *Optional*: `setWaypointGroupPacked(noteId, groupId, bytes packedSteps)`

### `TipSystem` (optional; or use simple payable route)

* `tip(noteId, token, amount)` → forwards to `Note.tipJar`, emits `Tip(noteId, from, token, amount)`

**Access control**: `Note.owner` can edit/update/link; anyone can read; anyone can tip/boost.

---

# App (DustKit) UX

### Tabs

* **Notes**: list + filters (Nearby, Global, Featured, Mine)
* **Editor**: create/edit note (markdown editor + tags)
* **Waypoints**: manage groups & steps (import/export JSON; attach to note)
* **Links**: attach note to a nearby entity (auto-populate entityId and XYZ from DustKit context)
* **Support**: Tip & Boost

### Context usage

* On load, use `connectDustClient()` to get:

  * `appContext.entityId` (if opened from a sign or object)
  * player position (for “Nearby” radius query)
* If opened from a **Sign**, show a banner: “This sign has X linked notes • open”

### Local Drafts

* Any editor changes go to `localStorage["dustnotes:draft:<tempId>"]` with autosave.
* Publish = call `createNote/updateNote`, then clear draft.

### Import/Export (Waypoints)

* **Export**: `{"name": "...","color": "#RRGGBB","steps":[{"x":..,"y":..,"z":..,"label":".."}]}`
* **Import**: JSON file or paste (validates bounds/types) → `setWaypointGroup` + `addWaypointStep*`.

### Boost/Featured UX

* “Boost note” modal: pick duration (e.g., 1h, 6h, 24h) and token (ETH for MVP).
* After tx: note appears in **Featured** tab until `boostUntil`.

### Tipping UX

* “Tip” button → choose token/amount → send → toast & update “Total tips”.

---

# Queries (client/indexer)

* **Nearby**: scan `NoteLink` where `distance(coord, playerPos) <= R` OR `entityId == context.entityId`.
* **Global**: recent `Note` by `updatedAt desc`.
* **Featured**: `boostUntil > now order by boostUntil desc`.
* **Mine**: `owner == userAddress`.
* **By Tag**: `tags includes <tag>` (client side if CSV; or separate `NoteTag` table if time permits).

---

# Integration points

* **Signs**: If the context entity is a Sign, show:

  * Quick “Attach Note” button (creates link)
  * Text cue: The sign’s vanilla text can simply be a title / emoji; the rich content lives in the app.
* **Waypoint Manager**: Your existing waypoint manager can read/write the `WaypointGroup` schema; keep import/export JSON identical so both apps interop.
* **Rail/Quest future**: Notes tagged `quest` with waypoint groups can power guided tours; later you can add a “Play Route” mode.

---

# Deliverables (hackathon)

**Contracts**

* Tables + `NoteSystem`, `WaypointSystem`, (optional) `TipSystem`
* Minimal tests: create/update/link, waypoints, boost duration math

**Client (App)**

* Tabs: Notes / Editor / Waypoints / Links / Support
* Nearby/Global/Featured lists
* Markdown editor (simple toolbar)
* Waypoint group CRUD + import/export
* Local drafts
* Tip + Boost modals

**Registration**

* Global app registration via `dust.appConfigUrl` on your namespace (e.g., `raidguild`)
* Optional: also allow contextual open on Signs via program’s `appConfigURI`

---

# Milestones & timebox (2 days)

**Day 1**

* 🧱 Tables + systems scaffold
* 🧪 Basic create/edit note (on-chain)
* 🔗 Link note to entity (from app context)
* 🧭 Waypoint groups & CRUD (no import yet)
* 🗂 Lists: Global + Nearby

**Day 2**

* 💾 Local drafts + publish
* 📤 Import/export waypoint groups (JSON)
* 💰 Tip + Boost (ETH only)
* 🎨 Polish UI, Featured tab, tags filter
* 📜 Register app + quick video demo

**Stretch**

* Arweave/IPFS hash field + optional upload
* CSV → real `NoteTag` table
* Packed waypoints to reduce gas
* Simple “Play Route” follow mode

---

# Dev notes & gotchas

* Keep strings small to avoid bloating gas. Trim markdown; consider soft 2–4 KB limit in UI.
* If you worry about sign destruction: don’t rely on sign storage—use `NoteLink` to any `entityId` and show links contextually.
* Use a single payment token (ETH) for Boost in MVP; abstract later.
* For Nearby, start with a client-side filter on links with cached coords. You can later add a server/indexer proximity query.

---

If you want, I can draft the `mud.config.ts` tables + minimal system interfaces next, and a stub React component for the tabs + local draft editor so you can drop it straight into your app.
