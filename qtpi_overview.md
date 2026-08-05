QTPI - Quest Tree Progression Interface
A program used to create and manage branching quests and storylines for a work of fiction.

Overall Tennants - Guidelines to follow throughout the development process:
- Keep things simple, in both design, engineering, and use
- Be flexible - allowing for user data, scaling expansion, data formats, etc

User Interface:
The main window of the program should consist of a tree of nodes - each node represents a story point within the given quest, with each quest having a starting node, an ending node, and n number of nodes between connecting them in a linear fashion. Being a tree, the overall structure starts with a single "root" node, with each node able to branch out into new beginning nodes to start new quests. The tree strucutre is visualized top-down, with the root node being at the top-center, and subsequent next nodes being underneath their parent/previous node. Branching nodes are represented by a new node appearing adjacent to its parent node. All nodes are visually connected with lines. Each new instance of a file/session should start with a single root node - it should not be possible to have zero nodes.
There should be an inspector panel on the right-hand side that displays information on a selected node, allowing the user to view and edit any information of a given node - ideally, this would be saved instantly (no need for a save button). Since all nodes will be connected, there should also be a button here for adding a new node - either a direct child node or a branching child node. There should also be the ability to delete a given node, but there will need to be safeguards for this, namely what to do if a node with children is deleted.
There should be a top-bar with general items, like a new button, load button, and save button. There may be additional buttons needed for other tasks, TBD.

Nodes:
Nodes will consist of some basic data for now, as well as possability for metadata. Start with a name for each node, and a short description (textfield). Each node will, datawise, need to know its previous (parent) node as well as any children (direct or branching) nodes it has. Each node can be color-cordinated, with a primary color related to the questline the node lives on, and a secondary color that can be configured by the user for categorization purposes - secondary colors and tags for each node would be good things to be able to search and sort by. Nodes will also contain metadata that the user can add, in a dictionary / object format.

Data:
Quest and node data should be able to be saved and loaded as a flat file - format TBD, though ideally the application will support multiple data formats.

---

Decisions

Platform & stack:
- **Pivoted from an original PySide6/Python desktop plan to a web-based stack**, so the app is portable to the browser rather than locked into a native Qt UI. Built with Vite + React + TypeScript, using `@xyflow/react` (React Flow) for the tree canvas.
- Web app first: runs as a pure browser app (`npm run dev` / static-site deploy) with no desktop shell. Wrapping it in Tauri or Electron for native desktop distribution is deferred - the choice between them (and whether it's needed at all) can be made later as a thin addition on top of the same frontend, without changing any React/component code.
- Single-user, local-only - no accounts, sync, or network calls. In the browser, "local file" access is handled via the File System Access API where supported, with a download/upload fallback for browsers that don't support it (Safari/Firefox).
- UI style: neutral, themeable (light/dark), implemented via CSS (`prefers-color-scheme` / `light-dark()`). Toolbar/panels/inspector use a neutral gray/white(-or-near-black) chrome; the tree canvas is where color lives, via each quest's primary color and each tag's color.

Data & persistence:
- JSON is the primary/default file format. Save/load logic is written behind a format-adapter interface so YAML, SQLite, or others can be added later without reworking the app.
- Inspector edits update in-memory state and the canvas instantly, with no per-field save step. The top-bar Save button writes the full tree to disk (prompting for a path via Save As if the file is new/unsaved). A background autosave to a hidden recovery file is a candidate nice-to-have, not required for v1.
- Session/file scope: one file open at a time. New/Load/Save act on a single active document; opening a different file while there are unsaved changes prompts Save/Discard/Cancel.
- Export: none beyond Save/Load for v1.

Data model:
- Child/edge model: each node has a `children` list where every entry pairs a child NodeId with an explicit `edgeType` ("continue" for linear quest continuation, "branch" for starting a new quest). Chosen for flexibility - leaves room for future edge types (e.g. "alternate", "merge").
- Quest boundaries: each node stores a `questId`. A "branch" edge assigns a new questId to the child; a "continue" edge copies the parent's questId. A separate `Quest` record (id, name, primaryColor, startNodeId, endNodeId) holds quest-level data.
- Primary color: auto-generated when a quest is created (next unused color from a preset palette), applied to every node in that quest automatically. The user can override it via the inspector, and the change propagates to the whole quest.
- Secondary color / tags: unified into a single tag system - there is no separate `secondaryColor` field on the node. Tags are global, managed objects (`TagDefinition { id, name, color }`), created/edited/deleted through a dedicated tag-management interface. A node just holds a list of tag IDs; every node sharing a tag automatically shares that tag's color. Nodes with multiple tags show each tag's color as its own small badge rather than one collapsed "secondary color".
- Ending-node marker: no special visual treatment - a leaf node (no outgoing edges) is implicitly the ending of its quest.
- Node deletion safeguard: deletion is blocked while a node has children - the user must delete or reassign all children first. No cascade-delete or auto-reparent automation.

UI & navigation:
- Canvas navigation: pan and zoom, a minimap (collapsible/hidable), search-to-node with jump/center, and collapse/expand of subtrees are all in scope for v1.
- Undo/redo: not built for v1. The block-deletion-until-childless safeguard plus manual reload-from-disk are the safety net; can be added later.

---

Development Plan

Architecture overview:
- Model layer (plain TypeScript, no React/UI dependency): `QuestNode`, `Quest`, `TagDefinition`, and a `TreeDocument` type plus pure functions that enforce invariants (single root always exists, deletion safeguard, questId propagation on branch/continue). Named `QuestNode`/`TreeDocument` rather than `Node`/`Document` to avoid colliding with the DOM's global `Node`/`Document` types and React Flow's own `Node` type.
- Persistence layer: a small `FormatAdapter` interface (`serialize(document) -> text`, `deserialize(text) -> document`) with a `jsonFormat` implementation and a registry keyed by file extension, so new formats can be added later without touching the model or UI. File I/O itself (reading/writing on disk) is a thin browser-specific layer on top of this (File System Access API, with download/upload fallback) - not yet built (that's Milestone 6).
- View layer: a React Flow (`@xyflow/react`) canvas with custom node/edge components, a top-down tree layout function (depth = y; "continue" child stays directly beneath its parent, "branch" children fan out sideways with reserved x-width per subtree to avoid overlap), pan/zoom and minimap (both built into React Flow, minimap made collapsible), and search-to-node.
- Inspector: a React panel bound to the current selection, editing name/description/tags/metadata instantly against in-memory document state, plus "Add continue node" / "Add branch node" and "Delete node" actions.
- Tag manager: a dialog/modal for creating/renaming/recoloring/deleting global tags.
- App shell: top toolbar (New/Load/Save/Save As/Tag Manager), central canvas, right-hand inspector panel - implemented now, Milestone 1.
- State management: kept as plain React state/context to start, per the "keep things simple" tenet; only introduce a dedicated state library (e.g. Zustand) later if prop-drilling/perf actually becomes a problem.

Project layout (as scaffolded):
```
qtpi/
  package.json
  vite.config.ts
  index.html
  src/
    main.tsx
    App.tsx
    index.css
    model/
      node.ts
      quest.ts
      tag.ts
      document.ts
    persistence/
      formatAdapter.ts   # interface + registry
      jsonFormat.ts
      index.ts            # registers built-in formats
    ui/
      Toolbar.tsx
      canvas/
        Canvas.tsx        # React Flow wrapper, pan/zoom/minimap/search
        nodeTypes.tsx
        layout.ts          # top-down tree layout algorithm
      inspector/
        InspectorPanel.tsx
        TagPicker.tsx
      dialogs/
        TagManagerDialog.tsx
    test/
      setup.ts
  *.test.tsx              # colocated Vitest tests
```

Example JSON shape (illustrative, not final schema):
```json
{
  "schemaVersion": 1,
  "rootId": "n1",
  "tags": {
    "t1": { "name": "foreshadowing", "color": "#e07a5f" }
  },
  "quests": {
    "q1": { "name": "The Old Mill", "primaryColor": "#4a90d9", "startNodeId": "n1", "endNodeId": "n7" }
  },
  "nodes": {
    "n1": {
      "name": "Arrive at the mill",
      "description": "...",
      "questId": "q1",
      "parent": null,
      "children": [
        { "id": "n2", "edgeType": "continue" },
        { "id": "n5", "edgeType": "branch" }
      ],
      "tags": ["t1"],
      "metadata": {}
    }
  }
}
```

Milestones:
1. Scaffolding (done) - Vite + React + TypeScript project, `@xyflow/react` installed, Vitest + Testing Library set up, an empty three-region app shell (toolbar / canvas / inspector) that builds, lints, tests, and runs in the browser.
2. Model & persistence (done) - `QuestNode`/`Quest`/`TagDefinition`/`TreeDocument` types, `createDocument`/`addContinueNode`/`addBranchNode`/`deleteNode`/`updateNode`/`getQuestEndNodeId` functions, JSON format adapter with a registry, 21 unit tests covering: new document always has one root node, continue inherits questId (and is capped at one per node), branch creates a new questId with an auto-assigned/distinct primary color, deletion is blocked for the root and for nodes with children, orphaned quests are cleaned up on delete, and JSON round-trips losslessly.
3. Read-only canvas (done) - `layoutTree` (pure top-down layout: a node's "continue" child always keeps its parent's exact x so a whole quest chain stays in one vertical column, "branch" children reserve their own subtree width and fan out sideways without overlapping) and `buildGraph` (converts a document into React Flow nodes/edges, dashing branch edges to distinguish them from continue edges) with 10 unit tests; `Canvas` renders the live document via React Flow with pan/zoom/zoom-controls, read-only (dragging/connecting disabled). Verified in a real headless-Chrome run: single-root default renders correctly, a 6-node demo tree (continue chain + two branches, one with its own continuation) laid out and rendered exactly as designed, pan/zoom confirmed working, no console errors.
4. Node interaction & inspector (done) - clicking a node selects it (visible blue outline; clicking the background deselects); the inspector shows/edits the selected node's name and description instantly (no save button, canvas label updates live); "Add continue node" (disabled once a continuation exists) and "Add branch node" auto-select the newly created node; "Delete node" is proactively disabled with an explanatory hint for the root node and for any node with children, with a defensive error banner as a fallback if a `DocumentError` is ever thrown anyway. 14 new unit tests (Inspector + Canvas selection), 45 total. Verified end-to-end in a real headless-Chrome run (select, rename, add-continue, blocked-delete, successful delete).
5. Tags & colors (done) - model gained `createTag`/`updateTag`/`deleteTag` (cascades off of every node that had it), `toggleNodeTag`, and `updateQuestColor`; a `TagManagerDialog` (opened via a new toolbar "Tags" button) lists/adds/renames/recolors/deletes tags; the inspector shows a quest-color swatch (overriding it updates every node in the quest, since nodes look up their quest's color live rather than storing a copy) and a checkbox per tag to assign/unassign it; the canvas got a custom `QuestNodeView` node type (registered as `"questNode"`) rendering a left-border stripe in the quest's primary color and a small colored dot per assigned tag. 26 new unit tests, 71 total. Verified end-to-end in a real headless-Chrome run: created tags, assigned them, saw the node update live, overrode a quest color and watched it propagate, added a branch and confirmed its quest got a distinct auto-assigned color, deleted a tag and watched its dot disappear.
6. File operations - New/Load/Save/Save As in the top bar using the File System Access API (with download/upload fallback), unsaved-changes guard on New/Load, single-root guarantee enforced on New.
7. Canvas navigation polish - collapsible minimap, search-to-node with jump/center, collapse/expand subtrees.
8. Theming & distribution - light/dark theme polish, deploy as a static site; revisit whether a Tauri/Electron desktop wrapper is wanted at this point.

Future / stretch (explicitly out of scope for v1):
- Desktop packaging via Tauri or Electron, if a native app is wanted alongside the web version.
- Undo/redo.
- Outline (text/Markdown) or image (PNG/SVG) export.
- Background autosave-to-recovery-file (e.g. via `localStorage`/IndexedDB).
- Additional format adapters (YAML; SQLite would need an in-browser engine like sql.js/wasm, notably heavier than the others).
