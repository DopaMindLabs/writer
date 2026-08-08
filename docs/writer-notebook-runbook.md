# Writer Notebook implementation runbook

Status: reference plan only. This branch must not be used as an implementation base.

Planning date: 8 August 2026.

## 1. Baseline and hand-off contract

The implementation branch must be created from the then-latest develop only after feat/writer-sync has merged into develop.

At the time this runbook was written:

- current develop is ae57214f8681e9795e5b869dc5f6ff3c803cdb2f;
- feat/writer-sync is eight commits ahead of that develop baseline;
- feat/writer-sync contains the npm workspace, writer-sync and writer-qr packages, provider-neutral operation journal, encrypted chunked blob transport, peer catch-up, pairing, and the current sync threat-model/protocol documents;
- this docs/writer-notebook-runbook branch is deliberately based on current develop and contains documentation only.

The implementing agent must re-read AGENTS.md and the relevant repository skills from the implementation baseline before changing code. At minimum use plan-writer-change, navigate-writer-codebase, implement-writer-change, test-writer-changes, change-writer-persistence, work-on-writer-sync and build-writer-ui. Read ACCESSIBILITY.md, docs/architecture.md, docs/technical-specification.md, docs/design-system.md and the Writer Sync threat/protocol documents relevant to any sync change.

Run CodeGraph availability/index detection first. If it is unavailable, continue with exact symbol/file search and TypeScript references. Do not block implementation on CodeGraph.

Seed the live todo list from the ordered stages in this document. Keep exactly one item in progress and update it as work is verified.

Branch-level writes still require the confirmation described by AGENTS.md. Never bypass hooks or use --no-verify.

If writer-sync has not yet landed in develop, stop. Do not implement from this reference branch and do not reproduce the sync stack by hand.

## 2. Goal

Add Writer Notes as a space-scoped, browser-only notebook feature.

A user can create multiple Writer Notes notebooks under Workshop, capture or import several photographed pages, keep them in an ordered notebook, browse them through a PDF-like thumbnail rail and single-page viewer, and retain a cleaned/vectorised representation for each page.

The reusable feature core lives in a standalone writer-notebook workspace package. Writer supplies only the host integration for space membership, Dexie persistence, Writer Sync replication, routes, React UI, help and archive behaviour.

The package must remain usable by another static JavaScript application with its own storage adapter.

## 3. Decisions already made

- Package name: writer-notebook.
- Writer UI label: Writer Notes.
- Multiple notebooks may exist in one space.
- Route: /s/:spaceId/notebooks/:notebookId.
- Selected page is URL-addressable through ?page=<pageId>.
- The package does not import Writer, React, Dexie, Lexical, Yjs or writer-sync.
- Writer-specific integration lives under src/lib/writerNotebookIntegration.
- Writer Notes content participates in Writer Sync through the existing provider-neutral operation/frame path.
- Source images, thumbnails and vector documents are stored as notebook assets.
- Binary notebook assets use the same encrypted, resumable chunk transport as other Writer binary content after the generic transport prerequisite in Stage 1.
- Transient processing state is local UI/worker state and is not replicated.
- The original visual page remains available after vectorisation. The stored source is a bounded, orientation-normalised image with metadata removed; the raw camera/upload file is not retained after normalisation succeeds.
- Vector output is stored as a bounded safe-vector document, never as arbitrary SVG markup.
- VTracer is the selected vectorisation candidate. Browser feasibility is a mandatory gate because the official npm JavaScript build is Node-targeted.
- DopaMindLabs/penecho is DopaMind's maintained fork of the third-party PenEcho project. Writer Notebook stays independent of PenEcho internals.
- No backwards-compatibility layer or Dexie migration is required. Writer currently has no users; schema changes remain on the single declared Dexie version.
- Root-cause fixes are required. Do not add notebook-specific special cases where an existing generic boundary is the actual defect.
- Proper domain types are required. Do not use any; use unknown only at genuinely untyped input boundaries and validate/narrow immediately.
- Inline comments are reserved for non-obvious invariants/external constraints. TSDoc/JSDoc and documentation use concise British English.

## 4. Explicitly out of scope for v1

- OCR or searchable handwriting.
- Reconstructing temporal pen strokes from a photograph.
- Word- or line-level handwriting editing.
- Automatic page-corner detection or perspective correction.
- OpenCV.
- Two-page animated book spreads/page-turn effects.
- A PenEcho-native editable-stroke conversion.
- New sync protocols or a notebook-specific provider.
- Server-side image processing.
- A runtime Rust dependency in Writer.
- CDN-hosted WASM.

A later release may add perspective correction, OCR/search, two-page spreads, annotations and richer PenEcho editing without changing the notebook ownership model.

## 5. Architecture and dependency direction

Expected dependency flow:

~~~text
Writer React UI
  -> src/lib/writerNotebookIntegration
       -> writer-notebook/core
       -> Writer Dexie tables
       -> Writer Sync journal/table policy
  -> writer-notebook/browser
       -> Web Worker
       -> same-origin VTracer WASM
~~~

The package boundary is intentionally one-way:

~~~text
packages/writer-notebook
  core     domain types, invariants, ordering, store port, safe-vector model
  browser  image normalisation, thumbnail generation, worker client, vectorisation

src/
  Writer adapter, Writer metadata, Dexie, sync, React, routes, i18n, help
~~~

writer-notebook must not depend on writer-sync. writer-sync must not depend on writer-notebook. The Writer adapter is the composition point.

A package consumer test must prove that an in-memory/static consumer can create, populate, reorder, rotate and delete a notebook without importing any src/ application module.

## 6. Existing analogues to follow

| Concern | Current precedent |
|---|---|
| Workspace/package boundary | packages/writer-sync/package.json, packages/writer-sync/test/packageBoundary.test.ts, packages/writer-sync/test/consumer.test.ts |
| Browser-only package facade | packages/writer-qr |
| Image input primitive | src/components/ui/FileInputTrigger.tsx |
| Existing image assets | src/lib/note-attachments.ts, src/data/note-attachments.ts, NoteAttachment in src/db/schema.ts |
| Chunked encrypted blob policy | src/lib/writerSyncIntegration/writerTablePolicy.ts |
| Chunk materialisation | src/lib/writerSyncIntegration/materialization/attachmentFramePayload.ts and attachmentFrameMaterializer.ts |
| Peer chunk storage | src/lib/writerSyncIntegration/attachmentChunkStore.ts |
| Workshop navigation | src/components/chrome/Sidebar/SectionMenuItems.tsx, SidebarSection.tsx, SidebarNav.tsx, WorkshopFallback.tsx |
| Routes | src/lib/routes.ts and src/App.tsx |
| Non-editor chrome | src/screens/space/BrainSpace.tsx, src/screens/space/Citations.tsx, src/components/chrome/Topbar.tsx |
| Mobile route selection | src/components/chrome/MobileTabs/useTabItems.ts |
| Space snapshot/archive | src/lib/backup/buildSpaceMarkdownZip.ts and src/lib/format/* |
| Replicated cascades | src/lib/docs/deleteDocCascade.ts, src/lib/space/deleteSpaceCascade.ts, src/lib/format/restoreSpaceArchive.ts |
| PenEcho image import | DopaMindLabs/penecho public/app.js: prepareImportedImage, addImageFile and clipboard image import |

Do not copy an analogue blindly. Preserve its owning invariant and fix any shared defect exposed by Writer Notes.

## 7. Current prerequisite defects exposed by Writer Notes

### 7.1 Binary transfer is policy-generic but Writer's durable chunk adapter is table-specific

writerTablePolicy.ts already exposes chunkedBlobField and chunkedBlobFieldFor(table). attachmentFramePayload.ts and attachmentFrameMaterializer.ts are correspondingly table-driven.

attachmentChunkStore.ts is not: it resolves frames and live rows through noteAttachments. syncAttachmentChunks is keyed by attachmentId plus index, so a future notebook asset with the same entity ID could also collide with a note attachment unless the transfer identifier includes the table.

Writer Notes must not add a second notebook-specific transfer path.

### 7.2 Replicated cascades still use collection delete paths

operationJournalMiddleware.ts explicitly does not journal deleteRange because Table.clear() is a local reset.

Current replicated cascades still contain collection .delete() calls, including deleteDocCascade.ts, deleteSpaceCascade.ts and restoreSpaceArchive.ts. These can bypass the per-row delete frames/tombstones required for cross-device deletion.

Writer Notes must not repeat this pattern. Stage 2 fixes the shared deletion call pattern before notebook tables are introduced.

## 8. Stage 1 — make binary transfer table-generic

Suggested branch/PR subject:

- branch: refactor/generic-blob-transfer
- PR title: refactor(sync): make blob transfers table-generic

### 8.1 Add a table-qualified transfer identifier

Add:

- src/lib/writerSyncIntegration/blobTransferId.ts
- src/lib/writerSyncIntegration/blobTransferId.test.ts

Use a versioned encoding that cannot collide across tables. The logical identity is:

~~~text
writer-blob:v1:<encoded entityTable>:<encoded entityId>
~~~

The implementation must encode components safely, reject malformed/ambiguous forms, and only admit an entityTable whose writerTablePolicy entry declares chunkedBlobField.

Public helpers should be typed and narrowly named, for example:

~~~ts
interface BlobTransferTarget {
  entityTable: string;
  entityId: string;
}

encodeBlobTransferId(target: BlobTransferTarget): string
decodeBlobTransferId(value: string): BlobTransferTarget
~~~

Do not accept an arbitrary Dexie table name from the wire.

### 8.2 Use the qualified identifier consistently

Update:

- src/lib/writerSyncIntegration/materialization/attachmentFramePayload.ts
- src/lib/writerSyncIntegration/materialization/attachmentFrameMaterializer.ts
- src/lib/writerSyncIntegration/materialization/operationJournalMiddleware.ts
- src/lib/writerSyncIntegration/attachmentChunkStore.ts
- src/db/schema.ts only if the SyncAttachmentChunk field naming is intentionally generalised
- adjacent tests for every edited file

The provider-neutral writer-sync attachment/chunk protocol may continue treating attachmentId as an opaque transfer identifier. A protocol rename is not required merely for terminology.

prepareFramePayload must build the manifest/chunk rows with the table-qualified transfer identifier. AAD binding remains the real frame values:

- accessScopeId
- entityTable
- entityId
- keyId
- epoch

attachmentFrameMaterializer must decode the transfer ID and assert that it resolves to the frame's exact entityTable and entityId. Remove the current assumption that manifest.attachmentId equals frame.entityId.

attachmentChunkStore must resolve the decoded table through the Writer table policy, retrieve only that configured table, and verify the domain row still exists before offering its manifest. Remove the literal noteAttachments lookup.

Deletion of a blob row must delete chunks by its qualified transfer ID.

### 8.3 Tests

Add adversarial and collision coverage:

- malformed transfer IDs are rejected;
- unclassified/local-only/non-chunked tables are rejected;
- a transfer ID cannot resolve to a different frame table or entity;
- same entity ID in two chunk-capable tables produces different transfer IDs;
- chunk lookup is scoped to the correct transfer ID and access scope;
- deletion removes only the intended transfer's chunks;
- existing note attachment transfer remains green.

The cross-table same-ID integration test becomes mandatory once writerNotebookAssets exists in Stage 4.

### Stage 1 acceptance

- Given two binary entities with the same entity ID in different chunk-capable tables, when their transfer IDs are created, then the identifiers and stored chunk keys differ.
- Given a manifest whose encoded table/entity does not match its authenticated frame, when materialisation runs, then the frame is rejected before a Blob is created.
- Given an existing note attachment, when peer catch-up transfers it, then its content still verifies, renders and survives reload.

## 9. Stage 2 — journal replicated cascade deletions

Suggested branch/PR subject:

- branch: fix/journal-replicated-cascades
- PR title: fix(sync): journal replicated cascade deletions

Add a canonical helper in the Writer integration/lib layer that:

1. resolves explicit primary keys for replicated rows;
2. deletes through bulkDelete (or another mutation form already proven to reach the journal);
3. batches large key lists when needed;
4. refuses use on a table not classified as journalled;
5. leaves local-only cleanup on the existing local reset path.

A suitable location is src/lib/writerSyncIntegration/journalledDelete.ts with a mirrored test.

Convert every current replicated collection-delete cascade found by exact search, not only the three examples above. At minimum inspect:

- src/lib/docs/deleteDocCascade.ts
- src/lib/space/deleteSpaceCascade.ts
- src/lib/format/restoreSpaceArchive.ts

Keep local-only rows such as docUpdates, meta, backups and other explicitly local stores on their current local deletion semantics.

Add regression tests that inspect journal/tombstone effects, not just local row disappearance.

### Stage 2 acceptance

- Given a document with annotations and revisions, when its cascade delete completes with a content key available, then every replicated deleted row has a delete operation/tombstone.
- Given a space cascade, when replicated children are removed, then a delayed peer cannot restore those rows from stale state.
- Given a local reset/clear path, when it runs, then the deliberate non-journalled reset semantics remain unchanged.

## 10. Stage 3 — add the standalone writer-notebook package

Suggested branch/PR subject:

- branch: feat/writer-notebook-package
- PR title: feat(notebook): add reusable writer-notebook package

Expected structure:

~~~text
packages/writer-notebook/
  package.json
  tsconfig.json
  src/
    core/
      index.ts
      notebook.types.ts
      notebookStore.ts
      notebookSdk.ts
      pageOrder.ts
      limits.ts
      safeVector.types.ts
      safeVectorValidation.ts
      safeVectorSerialisation.ts
    browser/
      index.ts
      image.types.ts
      imageNormalisation.ts
      thumbnail.ts
      pageProcessor.ts
      vectoriser.types.ts
      vectorWorkerClient.ts
      worker/
        vectorise.worker.ts
      vtracer/
        browser wrapper + generated same-origin WASM artefacts/provenance
  test/
    packageBoundary.test.ts
    consumer.test.ts
    pageOrder.test.ts
    safeVectorValidation.test.ts
    safeVectorSerialisation.test.ts
~~~

Follow writer-sync/writer-qr package conventions: private 0.0.0 workspace package, explicit subpath exports and no wildcard export.

Recommended public exports:

~~~json
{
  "./core": "./src/core/index.ts",
  "./browser": "./src/browser/index.ts"
}
~~~

### 10.1 Core domain

The portable domain does not contain spaceId or Writer replication metadata.

~~~ts
interface Notebook {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

type PageRotation = 0 | 90 | 180 | 270;

interface NotebookPage {
  id: string;
  notebookId: string;
  order: number;
  sourceAssetId: string;
  thumbnailAssetId: string;
  vectorAssetId?: string;
  width: number;
  height: number;
  rotation: PageRotation;
  createdAt: number;
  updatedAt: number;
  vectorisation?: {
    engine: string;
    engineVersion: string;
    preset: string;
    presetVersion: number;
  };
}

type NotebookAssetKind = "source" | "thumbnail" | "vector";

interface NotebookAsset {
  id: string;
  notebookId: string;
  pageId: string;
  kind: NotebookAssetKind;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
}
~~~

The Writer adapter will close a NotebookStore instance over one space. That keeps spaceId out of the package while making listNotebooks() naturally host-scope-specific.

### 10.2 Safe-vector model

Persist a data model, not SVG text:

~~~ts
interface SafeVectorDocumentV1 {
  version: 1;
  width: number;
  height: number;
  paths: readonly {
    d: string;
    fill: string;
  }[];
}
~~~

The VTracer spike must determine whether another narrowly-defined field such as fillRule is genuinely needed. Extend the type only for constructs proven necessary by representative VTracer output.

Validation requirements:

- finite positive dimensions within page limits;
- bounded path count;
- bounded total serialised bytes/path-data length/command count;
- path data limited to the admitted SVG path grammar and finite numbers;
- colours limited to the chosen safe grammar;
- no elements, event handlers, URLs, stylesheets, scripts, foreignObject, external references or arbitrary attributes;
- version must be exactly supported;
- unknown input is validated before it becomes SafeVectorDocumentV1.

Rendering creates application-owned SVG/path elements from this object. Never use dangerouslySetInnerHTML.

safeVectorSerialisation may produce an image/svg+xml Blob for export/PenEcho interchange only from a validated SafeVectorDocumentV1.

### 10.3 Store port and SDK

Use bundle operations so the host can enforce atomic persistence:

~~~ts
interface NotebookStore {
  listNotebooks(): Promise<readonly Notebook[]>;
  getNotebook(id: string): Promise<Notebook | undefined>;
  listPages(notebookId: string): Promise<readonly NotebookPage[]>;
  getPage(id: string): Promise<NotebookPage | undefined>;
  getAsset(id: string): Promise<NotebookAsset | undefined>;

  insertNotebook(value: Notebook): Promise<void>;
  updateNotebook(value: Notebook): Promise<void>;
  insertPageBundle(
    page: NotebookPage,
    assets: readonly NotebookAsset[],
  ): Promise<void>;
  attachVector(page: NotebookPage, asset: NotebookAsset): Promise<void>;
  replacePageOrder(pages: readonly NotebookPage[]): Promise<void>;
  deletePageBundle(pageId: string): Promise<void>;
  deleteNotebookTree(notebookId: string): Promise<void>;
}
~~~

createNotebookSdk receives store, ids, clock and limits. It owns title validation, IDs, order invariants, rotation, page limits and deterministic sorting. The store owns atomic host persistence.

The in-memory consumer fixture must implement the interface without Writer code.

### 10.4 Ordering/conflict rule

Persist page order per row as a number. Sort by (order, id). A local reorder rewrites a dense 0..n-1 sequence atomically.

Writer Sync later converges each row independently. Duplicate order numbers after concurrent device edits therefore still display deterministically because id is the tie-breaker; no page disappears behind a last-writer-wins ordered-ID array.

Do not store one notebook-level pageIds array as the source of truth.

## 11. Stage 3A — VTracer browser feasibility gate

The official @visioncortex/vtracer JavaScript package is currently documented upstream as a Node.js WASM build. Do not install that Node package into the Vite client and shim fs/node imports.

Use the current VTracer 1.0 code as the candidate and prove a browser-targeted build before adoption. The selected browser artefact must be pinned to an upstream revision/release and carry licence/provenance and a checksum.

The spike must prove:

- browser-targeted WASM works in a Vite production build and a dedicated module Worker;
- no node: or filesystem import reaches the browser;
- ordinary npm install/build/test does not require Rust;
- Rust/wasm-pack is needed only to reproduce/update the vendored browser artefact, if that is the chosen packaging method;
- WASM is loaded same-origin and works offline;
- no CDN is required;
- worker cancellation/termination releases the job and the next job can run;
- one-job-at-a-time processing bounds memory;
- representative phone and desktop page images complete within acceptable memory/time;
- VTracer's black-and-white/adaptive-threshold configuration produces useful handwriting output;
- raw SVG output is fully reduced into SafeVectorDocumentV1;
- CSP is not silently weakened. If WASM needs a CSP directive, demonstrate the minimum directive, update the threat review and stop for approval if it materially broadens execution policy;
- normal source/thumbnail/vector assets remain comfortably below writer-sync's existing 100 MiB transfer ceiling.

Freeze the successful configuration as handwriting-v1 and persist its engine version/preset version on NotebookPage.

Suggested initial product/resource ceilings, to be validated by the spike:

- source upload: 20 MiB before decode;
- decoded source: at most 20 million pixels and 4096 px on either edge after normalisation;
- pages per notebook: 100;
- aggregate notebook assets: 256 MiB;
- vector asset: 8 MiB;
- safe-vector paths: 50,000;
- vectorisation concurrency: one job.

The spike may reduce these ceilings when evidence requires it. Raising them requires a deliberate review because the limits protect browser memory, archive size and peer-transfer resource use.

If VTracer cannot meet the browser, CSP, resource or maintainability gates without a brittle workaround, stop and report. Do not substitute a different vectoriser without approval.

## 12. Browser processing pipeline

Durable flow:

~~~text
File/camera input
  -> validate MIME and raw byte ceiling
  -> decode
  -> honour image orientation
  -> resize to bounded source dimensions
  -> re-encode normalised source (strips EXIF/location metadata)
  -> create bounded thumbnail
  -> persist page + source + thumbnail
  -> enqueue vectorisation
  -> worker produces VTracer SVG
  -> validate/reduce to SafeVectorDocumentV1
  -> serialise safe-vector JSON Blob
  -> persist vector asset + provenance
  -> viewer defaults to Vector
~~~

The page becomes usable as soon as source + thumbnail persist. Vectorisation is asynchronous.

Process multi-image selections in picker order and with bounded concurrency. Do not decode a whole notebook of phone photographs simultaneously.

A failed/cancelled vectorisation leaves the source/thumbnail/page intact and exposes Retry. Reprocessing should update/reuse the vector asset rather than leaving orphan vector blobs.

No raw camera/upload data is logged. No SVG/vector path content is logged.

Transient states such as preparing, vectorising, validating, saving and failed live in the worker/UI state, not in replicated rows.

## 13. Stage 4 — Writer persistence, sync and archive integration

Suggested branch/PR subject:

- branch: feat/writer-notebook-persistence
- PR title: feat(notebook): persist and sync Writer Notes

### 13.1 Writer row types and stores

Add Writer-specific row types that extend the package types with ReplicatedEntityMetadata and spaceId:

~~~ts
interface WriterNotebook extends Notebook, ReplicatedEntityMetadata {
  spaceId: string;
}

interface WriterNotebookPage extends NotebookPage, ReplicatedEntityMetadata {
  spaceId: string;
}

interface WriterNotebookAsset extends NotebookAsset, ReplicatedEntityMetadata {
  spaceId: string;
}
~~~

Update:

- src/db/schema.ts
- src/db/stores.ts
- src/db/LoremDB.ts
- focused DB/schema tests

Expected stores:

~~~text
writerNotebooks: id, spaceId
writerNotebookPages: id, notebookId, spaceId
writerNotebookAssets: id, notebookId, spaceId
~~~

Do not index title, order, kind, MIME or timestamps merely for convenience. They stay encrypted. Do not add version(2), upgrade() or migration code.

### 13.2 Writer adapter

Add:

~~~text
src/lib/writerNotebookIntegration/
  writerNotebookStore.ts
  writerNotebookStore.test.ts
  createWriterNotebookSdk.ts
  writerNotebookLimits.ts
  index.ts
~~~

The adapter owns:

- space scoping;
- currentPrincipal();
- newEntityMetadata();
- touched/reminted metadata;
- transaction boundaries;
- journal-safe subtree deletion;
- conversion between package rows and Writer replicated rows.

The package never sees these concepts.

Route reads must verify both notebook ID and space ID. A notebook belonging to another space must not render under the requested space route.

### 13.3 Writer Sync policy

Update src/lib/writerSyncIntegration/writerTablePolicy.ts:

~~~text
writerNotebooks      synced content, space scope, row envelope
writerNotebookPages  synced content, space scope, row envelope
writerNotebookAssets synced content, space scope, row envelope, chunkedBlobField = blob
~~~

The policy is authoritative. Derived encryption/unsynced/fan-out lists must continue deriving from it rather than acquiring new handwritten duplicates.

Extend:

- writerTablePolicy.test.ts;
- cloud crypto/tableRules tests;
- operation-journal/materialisation tests;
- full-state rebuild tests;
- generic chunk-store tests.

Prove a note attachment and notebook asset with the same entity ID remain isolated end to end.

### 13.4 Deletion lifecycle

Page deletion transaction:

1. resolve the page under its notebook/space;
2. enumerate its asset IDs;
3. delete replicated asset rows with the journal-safe helper;
4. delete the page row;
5. renumber surviving pages densely and touch replication metadata for rows whose order changes.

Notebook deletion transaction:

1. resolve notebook in the active space;
2. enumerate pages;
3. enumerate all page assets;
4. journal-delete assets;
5. journal-delete pages;
6. journal-delete notebook.

Space deletion and archive restore must include all three notebook tables and use the same journal-safe replicated deletion path.

Do not delete a replicated subtree through Collection.delete().

### 13.5 Archives/backups/import/restore

Writer Notes are space data and must round-trip through every canonical archive path.

Update at least:

- src/lib/backup/buildSpaceMarkdownZip.ts
- src/lib/format/codecs.ts
- src/lib/format/manifest.ts
- src/lib/format/buildSpaceArchive.ts
- src/lib/format/parseSpaceArchive.ts
- src/lib/format/importSpaceArchive.ts
- src/lib/format/restoreSpaceArchive.ts
- src/lib/space/deleteSpaceCascade.ts
- related backup/import/restore/folder-sync tests

The planning snapshot uses archive format version 2. The expected Writer Notes archive becomes version 3. If develop has changed the archive version before implementation starts, stop and reconcile the runbook rather than layering an incorrect version number.

No parser/migration for the previous archive format is required under the project's current no-users/no-backwards-compatibility policy.

Manifest counts must include notebooks, pages and assets.

Canonical records should mirror existing note-attachment handling: JSON records contain metadata and an archive asset path; binary data lives as zip entries, not base64 JSON.

Suggested layout:

~~~text
records/writerNotebooks/<id>.json
records/writerNotebookPages/<id>.json
records/writerNotebookAssets/<id>.json
assets/writer-notes/<notebook-id>/<page-id>/<asset-id>.<ext>
writer-notes/<notebook-name>/index.md
writer-notes/<notebook-name>/page-001.<source-ext>
writer-notes/<notebook-name>/page-002.<source-ext>
~~~

The records/assets layer is canonical for lossless restore. The writer-notes/ projection is human-readable.

Parser validation must check:

- manifest counts;
- every notebook belongs to the archive space;
- every page references an existing notebook in that space;
- every asset references an existing notebook/page;
- each page sourceAssetId/thumbnailAssetId/vectorAssetId points to an asset of the expected kind;
- asset MIME/byte/resource limits;
- safe-vector assets validate before use.

Import as a new space must remap:

- notebook IDs;
- page IDs;
- asset IDs;
- page notebookId;
- asset notebookId/pageId;
- sourceAssetId;
- thumbnailAssetId;
- vectorAssetId;
- spaceId/accessScopeId;
- mutation identity/logical time through the existing remint path.

Folder sync uses the canonical space archive, so add regression coverage that Writer Notes survive that path; do not invent a notebook-specific folder-sync format.

## 14. Stage 5 — Writer Notes UI

Suggested branch/PR subject:

- branch: feat/writer-notebook-ui
- PR title: feat(notebook): add Writer Notes to Workshop

### 14.1 Routes and screen

Update:

- src/lib/routes.ts
- src/App.tsx
- route tests

Add:

- src/screens/space/WriterNotebook.tsx
- matching screen test

Route:

~~~text
/s/:spaceId/notebooks/:notebookId?page=<pageId>
~~~

If page is absent, select the first page. If page is unknown, replace it with the first valid page. Back/forward navigation must follow page changes.

### 14.2 Hooks/integration

Add:

- src/hooks/useWriterNotebooks.ts
- src/hooks/useWriterNotebookPages.ts if keeping the queries separate improves ownership;
- mirrored tests.

Reads remain space-scoped and live-query compatible.

### 14.3 Workshop navigation

Update the Workshop path rather than creating a parallel navigation area:

- src/components/chrome/Sidebar/SectionMenuItems.tsx
- SectionMenuItems.test.tsx and story if affected
- src/components/chrome/Sidebar/SidebarSection.tsx
- src/components/chrome/Sidebar/SidebarNav.tsx
- src/components/chrome/Sidebar/WorkshopFallback.tsx
- relevant Sidebar tests/stories

The Workshop menu offers both existing Add workspace and Add Writer Notes.

Writer Notes notebooks appear under Workshop beside Brain Space and before ordinary Workshop documents. Each notebook row supports opening, rename and delete, and exposes its page count accessibly.

The mobile drawer reuses Sidebar, so it receives the same notebook list rather than a separate mobile implementation.

### 14.4 Notebook surface

Add one component per file with mirrored unit test and Storybook story where the component is new:

~~~text
src/components/writer-notebook/
  NotebookToolbar.tsx
  NotebookPageRail.tsx
  NotebookPageThumbnail.tsx
  NotebookPageViewer.tsx
  NotebookPageMenu.tsx
  NotebookEmptyState.tsx
  NotebookProcessingStatus.tsx
  SafeVectorPage.tsx
~~~

Desktop:

- vertical PDF-style thumbnail rail on the left;
- centred single-page viewer;
- previous/next and Page N of M;
- Original/Vector switch when vector output exists;
- Add photos and Take photo actions;
- rotate, move earlier/later and delete page;
- selected thumbnail scrolls into view.

Mobile:

- thumbnail rail becomes horizontal;
- viewer fills the available width below it;
- Take photo requests capture="environment";
- Choose photos permits multiple files;
- no hover-only action.

### 14.5 File input primitive

Extend src/components/ui/FileInputTrigger.tsx with a typed capture prop rather than creating another hidden file-input implementation.

Update:

- FileInputTrigger.test.tsx;
- FileInputTrigger.stories.tsx;
- docs/design-system.md §3.7.

Keep Take photo and Choose photos as separate actions because camera capture and multi-file picking have different user expectations.

### 14.6 Topbar/mobile chrome

Topbar.tsx currently infers Citations from location.pathname and otherwise assumes editor-like tools. Writer Notes must not accidentally inherit ModeTabs, search, Citations, focus or inspector actions.

Replace route sniffing with an explicit/discriminated surface contract and update every existing caller plus Topbar.test.tsx. The writer-notes surface shows the space/notebook breadcrumb and only appropriate navigation; page operations belong in NotebookToolbar.

Update src/components/chrome/MobileTabs/useTabItems.ts so a notebook route is not misclassified as Write. Writer Notes does not need a new bottom tab; Workshop/Sidebar is its navigation owner.

### 14.7 i18n/help/spec

Add all visible strings to the appropriate English i18n namespaces, expected primarily in:

- src/i18n/locales/en/chrome.json
- src/i18n/locales/en/screens.json

Add:

- src/help/content/en/writer-notes.md
- registry metadata in src/lib/help/registry.ts
- registry tests

Update docs/technical-specification.md in the same PR:

- Feature Outline;
- Information Architecture routes/data model;
- Workshop/document navigation behaviour;
- Writer Notes user flow;
- persistence/sync behaviour;
- backup/archive behaviour;
- testing map/known gaps where applicable.

Use British English and verified UI labels. Do not expose WASM, VTracer, tables or sync protocol detail as normal Help Center instructions.

## 15. Accessibility requirements

Apply ACCESSIBILITY.md, not an inferred universal contrast rule.

- light/dark: WCAG 2.2 AA minimum;
- hc-light/hc-dark: enhanced AAA contrast target;
- non-text UI: applicable SC 1.4.11;
- keyboard: SC 2.1.1 and applicable enhanced criteria;
- focus must remain visible/not obscured (including the thumbnail rail);
- controls have names and correct name/role/value;
- reduced-motion preference is honoured;
- zoom/reflow and mobile layouts remain operable.

Specific Writer Notes behaviour:

- thumbnails are controls named Page 1, Page 2, etc.;
- selected page exposes aria-current;
- previous/next, Original/Vector, rotation, deletion and reordering are keyboard operable;
- reordering has Move earlier/Move later; drag must never be the only method;
- after deletion, focus moves to the nearest surviving page or the empty-state add action;
- processing uses a polite status announcement;
- errors use the established alert/feedback primitives;
- thousands of vector paths are hidden from the accessibility tree; the rendered page has one useful page-level accessible name;
- camera/upload controls have visible labels;
- no action depends only on hover, colour or motion.

Run Storybook a11y checks and manual keyboard/screen-reader/zoom/reflow review in addition to automated axe coverage.

## 16. Security/threat review

Review against Writer Sync's feature threat model and OWASP Top 10:2025. Relevant categories include:

- A01 Broken Access Control: notebook/page/asset route and store operations stay bound to the requested space/access scope.
- A02 Security Misconfiguration: do not weaken CSP or service-worker/offline policy casually for WASM.
- A03 Software Supply Chain Failures: pin/provenance/checksum the VTracer browser artefact; no CDN.
- A04 Cryptographic Failures: notebook assets must use the existing row/frame encryption and authenticated AAD/chunk path; no plaintext sync bypass.
- A05 Injection: arbitrary SVG/HTML must never reach the DOM. Render only validated SafeVectorDocument data.
- A06 Insecure Design: hard page/file/pixel/vector/aggregate/concurrency limits protect browser and sync resources.
- A08 Software or Data Integrity Failures: validate archive records, vector structures, chunk hashes and table-qualified transfer identities.
- A09 Security Logging and Alerting Failures: report bounded diagnostic metadata without logging note images/vector payloads or secrets.
- A10 Mishandling of Exceptional Conditions: malformed files, decode errors, worker crashes, cancellation, incomplete chunks and invalid vector output fail closed while retaining the safe source page where appropriate.

Tests must include adversarial SVG/vector structures, oversized metadata, malformed transfer IDs, incomplete chunk sets and processing failures. Happy-path tests alone do not clear these boundaries.

## 17. DopaMind PenEcho fork integration

DopaMindLabs/penecho is a maintained DopaMind fork. Upstream parity is useful for maintenance but does not block DopaMind from adding the interface Writer needs.

Writer Notebook must expose an interchange boundary rather than importing PenEcho.

### 17.1 v1 interchange

writer-notebook/core should be able to serialise a validated page as:

- safe image/svg+xml generated from SafeVectorDocumentV1; and
- PNG/WebP rendering when a raster hand-off is preferable.

The current DopaMind PenEcho fork already owns file/clipboard image-import plumbing in public/app.js (prepareImportedImage, addImageFile and clipboard image paths). A PenEcho regression test must prove the chosen Writer export MIME is accepted. If SVG is accepted it will currently be rasterised into PenEcho's image/canvas model; vector path editability is not implied.

This gives a clean interchange even before a direct in-app hand-off exists.

### 17.2 Direct programmatic bridge in the DopaMind fork

Treat a direct Writer -> PenEcho hand-off as a separate DopaMindLabs/penecho change/review, not as a writer-notebook dependency.

Refactor the fork's image-import implementation behind one stable, tested import function that reuses the existing limits/normalisation path. If Writer and PenEcho communicate across an iframe/window boundary, use a versioned postMessage schema with exact origin checks and validated message data. Do not reach into PenEcho DOM state, depend on internal global functions or bypass its normal image safety limits.

The Writer-side feature detects the supported bridge version. The portable writer-notebook package knows nothing about it.

Native editable strokes remain a later PenEcho capability because image vectorisation recovers shapes/paths, not the original timing/pressure stroke history.

## 18. Test plan

Tests are written first for each behaviour.

### Stage 1 sync refactor

- blobTransferId unit tests;
- attachmentFramePayload/materialiser negative tests;
- attachmentChunkStore generic-resolution/collision tests;
- existing Writer Sync package/attachment tests.

### Stage 2 cascade fix

- journalledDelete unit test;
- deleteDocCascade journal/tombstone assertions;
- deleteSpaceCascade journal/tombstone assertions;
- restoreSpaceArchive deletion assertions;
- existing local reset tests remain green.

### Stage 3 package

- package boundary forbids src/, React, Dexie, writer-sync, Lexical, Yjs and node builtins from core/browser runtime where inappropriate;
- in-memory consumer proves the SDK;
- title/order/rotation/page-limit tests;
- malicious safe-vector validation matrix;
- safe-vector serialisation round-trip;
- worker cancellation/retry;
- representative handwriting fixtures for vectorisation fidelity;
- production Vite build/WASM/offline smoke proof.

### Stage 4 persistence/archive

- schema shape;
- Writer table policy classification;
- encryption middleware covers new content;
- CRUD/store adapter transactions;
- page reorder metadata;
- page/notebook/space deletion tombstones;
- archive build -> parse -> restore lossless round trip;
- archive import remaps every notebook/page/asset reference;
- malformed cross-reference/asset archives fail;
- note attachment + notebook asset same-ID chunk collision regression;
- full-state rebuild includes Writer Notes.

### Stage 5 UI/e2e

Add focused Playwright coverage, for example:

- e2e/writer-notes.spec.ts
- e2e/writer-notes-mobile.spec.ts
- e2e/writer-notes-pair-sync.spec.ts

Cover:

- create multiple notebooks in one space;
- add multiple fixture photos and preserve picker order;
- reload persistence;
- thumbnail/previous/next/query-string navigation;
- Original/Vector switching;
- rotate/reorder/delete;
- keyboard-only flow and focus after delete;
- mobile horizontal rail and camera input attributes;
- vectorisation failure -> retained source -> retry;
- paired device receives notebook metadata and a multi-chunk source/vector asset, renders it and keeps it after reload;
- offline/delayed peer receives additions and deletions;
- axe/non-regression assertions for the new route.

New/changed feature code targets at least 95% local e2e coverage and may not lower the global ratchet. The 85% local floor and stop-and-ask rule in AGENTS.md still apply.

## 19. Verification gates

Run targeted tests during each TDD cycle, then the repository gates before each PR:

~~~bash
npm run lint
npm run typecheck
npm run test:run
~~~

For UI/interaction-facing stages:

~~~bash
npm run test:e2e
npm run test:e2e:coverage
~~~

For the browser package/WASM stage also run the production build and offline/static-asset smoke path used by the repository.

Never skip/focus/weaken tests, add suppressions, lower coverage, or bypass Git hooks to make a gate pass.

## 20. PR order and dependencies

| Order | PR | Depends on | Purpose |
|---|---|---|---|
| 1 | refactor(sync): make blob transfers table-generic | writer-sync merged to develop | remove hard-coded noteAttachments transfer identity/resolution |
| 2 | fix(sync): journal replicated cascade deletions | PR 1 may be independent but both must land before Stage 4 | repair shared replicated deletion path |
| 3 | feat(notebook): add reusable writer-notebook package | latest develop | portable domain/browser processing + VTracer gate |
| 4 | feat(notebook): persist and sync Writer Notes | PRs 1-3 | Writer adapter, three tables, archive and sync integration |
| 5 | feat(notebook): add Writer Notes to Workshop | PR 4 | route, Workshop UI, viewer, camera/upload, help/spec/a11y/e2e |

Prefer merging/rebasing each stage onto latest develop before the next PR. If stacked temporarily, keep dependencies explicit and retarget/rebase when preceding work lands.

Every PR uses a valid Conventional Commit title and follows the repository PR template exactly. Open PRs as Draft. The human-only PR attestation remains unticked by agents.

## 21. Definition of done

- Given a static JavaScript consumer with an in-memory NotebookStore, when it uses writer-notebook/core and writer-notebook/browser, then it can manage/process notebook pages without importing Writer.
- Given one Writer space, when the user creates Writer Notes twice, then two independent notebooks appear under Workshop.
- Given several selected page images, when import completes, then pages retain deterministic picker order and the UI remains responsive.
- Given a stored page, when vectorisation succeeds, then Original and Vector are both available and the stored vector contains only the safe-vector schema.
- Given vectorisation failure/cancellation, when the user returns to the page, then the normalised source remains usable and Retry can start a fresh bounded job.
- Given a malicious or unsupported SVG/vector structure, when validation runs, then no arbitrary markup reaches the DOM.
- Given a paired device, when a Writer Notes page contains a multi-chunk asset, then the peer receives, verifies, materialises and renders it through ordinary Writer Sync.
- Given a note attachment and notebook asset sharing the same entity ID, when both are transferred, then neither reads, overwrites or deletes the other's chunks.
- Given a notebook/page/space deletion, when a delayed peer reconnects, then deleted Writer Notes rows remain deleted according to Writer Sync tombstone/convergence rules.
- Given an archive export followed by restore, when Writer Notes are present, then notebook/page/asset content and references are lossless.
- Given an archive import as a new space, when Writer Notes are present, then every notebook/page/asset ID/reference and access scope is remapped consistently.
- Given a desktop route, when the user navigates a notebook, then the left thumbnail rail, main page viewer and keyboard controls work.
- Given a mobile route, when the user navigates the notebook, then the horizontal thumbnail strip and upload/camera controls work without horizontal overflow.
- Given default light/dark themes, when the Writer Notes UI is inspected, then applicable WCAG 2.2 AA requirements are met; hc-light/hc-dark retain the enhanced target recorded in ACCESSIBILITY.md.
- Given the current DopaMind PenEcho fork, when a validated Writer Notebook page is exported through the agreed image interchange, then PenEcho can import it through its normal bounded image path without writer-notebook depending on PenEcho.
- Given all implementation stages, when repository verification runs, then lint, typecheck, unit tests, required e2e tests and coverage gates pass without skips, suppressions or lowered floors.

## 22. Handover rule

If implementation pauses, use handover-writer-work. Reconcile the live todo list first and record:

- current implementation branch and exact head;
- stages completed/in progress/pending;
- files changed and why;
- tests/gates actually run and their results;
- VTracer upstream revision/build/checksum if Stage 3 has started;
- any dependency/CSP/security question still awaiting approval;
- any drift found between this runbook and the then-current develop.

Never report an unrun gate as green.

## 23. Source references used for this plan

Writer planning snapshot:

- https://github.com/DopaMindLabs/writer/tree/feat/writer-sync
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/docs/architecture.md
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/docs/technical-specification.md
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/src/lib/writerSyncIntegration/writerTablePolicy.ts
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/src/lib/writerSyncIntegration/attachmentChunkStore.ts
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/src/lib/writerSyncIntegration/materialization/operationJournalMiddleware.ts
- https://github.com/DopaMindLabs/writer/blob/feat/writer-sync/src/lib/format/manifest.ts

VTracer:

- https://github.com/visioncortex/vtracer
- https://github.com/visioncortex/vtracer/tree/master/nodejs

DopaMind PenEcho fork:

- https://github.com/DopaMindLabs/penecho
- https://github.com/DopaMindLabs/penecho/blob/main/public/app.js

OWASP baseline:

- https://owasp.org/Top10/2025/
