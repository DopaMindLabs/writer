import JSZip from 'jszip';
import { invariant } from '@/lib/invariant';
import {
  DEFAULT_NOTEBOOK_LIMITS,
  parseSafeVectorBlob,
  SAFE_VECTOR_DOCUMENT_MIME,
} from 'writer-notebook/core';
import type {
  Annotation,
  Citation,
  Connection,
  Doc,
  DocInspectorConfig,
  HighlightPalette,
  Note,
  NoteAttachment,
  Revision,
  Section,
  Space,
  WriterNotebook,
  WriterNotebookAsset,
  WriterNotebookPage,
} from '@/db/schema';
import { MANIFEST_FILENAME, parseManifest, type ArchiveManifest } from './manifest';
import { RECORDS_DIR } from './buildSpaceArchive';
import {
  parseAnnotationRecord,
  parseCitationRecord,
  parseConnectionRecord,
  parseDocInspectorConfigRecord,
  parseDocRecord,
  parseNoteAttachmentRecord,
  parseNoteRecord,
  parsePaletteRecord,
  parseRevisionRecord,
  parseSectionRecord,
  parseSpaceRecord,
  parseWriterNotebookAssetRecord,
  parseWriterNotebookPageRecord,
  parseWriterNotebookRecord,
  type NoteAttachmentRecord,
  type WriterNotebookAssetRecord,
} from './codecs';

export interface ParsedSpaceArchive {
  manifest: ArchiveManifest;
  space: Space;
  sections: Section[];
  docs: Doc[];
  notes: Note[];
  attachments: NoteAttachment[];
  annotations: Annotation[];
  citations: Citation[];
  connections: Connection[];
  revisions: Revision[];
  palettes: HighlightPalette[];
  writerNotebooks: WriterNotebook[];
  writerNotebookPages: WriterNotebookPage[];
  writerNotebookAssets: WriterNotebookAsset[];
  docInspectorConfig: DocInspectorConfig | null;
}

const readJsonEntry = async (zip: JSZip, path: string): Promise<unknown> => {
  const entry = zip.file(path);
  invariant(entry, `Archive is missing ${path}`);
  const text = await entry.async('string');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Archive entry ${path} is not valid JSON`);
  }
};

const parseTable = async <T>(
  zip: JSZip,
  table: string,
  parse: (value: unknown) => T,
): Promise<T[]> => {
  const prefix = `${RECORDS_DIR}/${table}/`;
  const out: T[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !entry.name.startsWith(prefix)) continue;
    out.push(parse(await readJsonEntry(zip, entry.name)));
  }
  return out;
};

const bindAttachmentBlobs = async (
  zip: JSZip,
  records: readonly NoteAttachmentRecord[],
): Promise<NoteAttachment[]> => {
  const out: NoteAttachment[] = [];
  for (const { assetPath, ...record } of records) {
    const asset = zip.file(assetPath);
    invariant(asset, `Archive is missing attachment asset ${assetPath}`);
    const data = Uint8Array.from(await asset.async('uint8array'));
    out.push({ ...record, blob: new Blob([data], { type: record.mime }) });
  }
  return out;
};

const parseAttachmentRecords = (zip: JSZip): Promise<NoteAttachmentRecord[]> =>
  parseTable(zip, 'noteAttachments', parseNoteAttachmentRecord);

const notebookAssetMaximum = (kind: WriterNotebookAsset['kind']): number => {
  if (kind === 'source') return DEFAULT_NOTEBOOK_LIMITS.maxSourceBytes;
  if (kind === 'thumbnail') return DEFAULT_NOTEBOOK_LIMITS.maxThumbnailBytes;
  return DEFAULT_NOTEBOOK_LIMITS.maxVectorBytes;
};

const bindNotebookAssetBlobs = async (
  zip: JSZip,
  records: readonly WriterNotebookAssetRecord[],
): Promise<WriterNotebookAsset[]> => {
  const out: WriterNotebookAsset[] = [];
  for (const { assetPath, ...record } of records) {
    invariant(assetPath.startsWith('assets/notebooks/'), 'Notebook asset path is outside its archive area');
    const entry = zip.file(assetPath);
    invariant(entry, `Archive is missing notebook asset ${assetPath}`);
    const data = Uint8Array.from(await entry.async('uint8array'));
    invariant(data.byteLength === record.size, `Notebook asset ${record.id} size does not match its record`);
    invariant(data.byteLength > 0 && data.byteLength <= notebookAssetMaximum(record.kind), `Notebook asset ${record.id} exceeds its byte limit`);
    if (record.kind === 'vector') invariant(record.mime === SAFE_VECTOR_DOCUMENT_MIME, `Notebook vector asset ${record.id} has an unsupported MIME type`);
    else invariant(record.mime.startsWith('image/'), `Notebook image asset ${record.id} has an unsupported MIME type`);
    const blob = new Blob([data], { type: record.mime });
    if (record.kind === 'vector') await parseSafeVectorBlob(blob, DEFAULT_NOTEBOOK_LIMITS.safeVector);
    out.push({ ...record, blob });
  }
  return out;
};

const COUNTED_TABLES: readonly (keyof ArchiveManifest['counts'])[] = [
  'sections',
  'docs',
  'notes',
  'noteAttachments',
  'annotations',
  'citations',
  'connections',
  'revisions',
  'palettes',
  'docInspectorConfigs',
  'writerNotebooks',
  'writerNotebookPages',
  'writerNotebookAssets',
];

const actualCounts = (
  archive: ParsedSpaceArchive,
  inspectorConfigCount: number,
): ArchiveManifest['counts'] => ({
  sections: archive.sections.length,
  docs: archive.docs.length,
  notes: archive.notes.length,
  noteAttachments: archive.attachments.length,
  annotations: archive.annotations.length,
  citations: archive.citations.length,
  connections: archive.connections.length,
  revisions: archive.revisions.length,
  palettes: archive.palettes.length,
  docInspectorConfigs: inspectorConfigCount,
  writerNotebooks: archive.writerNotebooks.length,
  writerNotebookPages: archive.writerNotebookPages.length,
  writerNotebookAssets: archive.writerNotebookAssets.length,
});

const pageWithinNotebookLimits = (page: WriterNotebookPage): boolean => {
  const pixels = page.width * page.height;
  return Number.isInteger(page.order)
    && page.order >= 0
    && page.width > 0
    && page.height > 0
    && page.width <= DEFAULT_NOTEBOOK_LIMITS.maxImageDimension
    && page.height <= DEFAULT_NOTEBOOK_LIMITS.maxImageDimension
    && pixels <= DEFAULT_NOTEBOOK_LIMITS.maxDecodedPixels;
};

const checkNotebookLimits = (archive: ParsedSpaceArchive): void => {
  const pagesPerNotebook = new Map<string, number>();
  const bytesPerNotebook = new Map<string, number>();
  for (const notebook of archive.writerNotebooks) {
    const title = notebook.title.trim();
    invariant(title.length > 0 && title.length <= DEFAULT_NOTEBOOK_LIMITS.maxTitleLength, `Notebook ${notebook.id} title exceeds its limit`);
  }
  for (const page of archive.writerNotebookPages) {
    invariant(pageWithinNotebookLimits(page), `Notebook page ${page.id} exceeds its page limits`);
    pagesPerNotebook.set(page.notebookId, (pagesPerNotebook.get(page.notebookId) ?? 0) + 1);
  }
  for (const asset of archive.writerNotebookAssets) {
    bytesPerNotebook.set(asset.notebookId, (bytesPerNotebook.get(asset.notebookId) ?? 0) + asset.size);
  }
  invariant([...pagesPerNotebook.values()].every((count) => count <= DEFAULT_NOTEBOOK_LIMITS.maxPagesPerNotebook), 'Notebook page count exceeds its limit');
  invariant([...bytesPerNotebook.values()].every((bytes) => bytes <= DEFAULT_NOTEBOOK_LIMITS.maxAggregateAssetBytes), 'Notebook aggregate asset size exceeds its limit');
};

const requirePageAsset = (input: {
  readonly page: WriterNotebookPage;
  readonly assets: ReadonlyMap<string, WriterNotebookAsset>;
  readonly assetId: string;
  readonly kind: WriterNotebookAsset['kind'];
}): void => {
  const asset = input.assets.get(input.assetId);
  invariant(asset, `Notebook page ${input.page.id} references a missing ${input.kind} asset`);
  invariant(asset.kind === input.kind && asset.pageId === input.page.id && asset.notebookId === input.page.notebookId, `Notebook page ${input.page.id} has an invalid ${input.kind} asset reference`);
};

const checkNotebookReferences = (archive: ParsedSpaceArchive): void => {
  const notebooks = new Set(archive.writerNotebooks.map(({ id }) => id));
  const pages = new Set(archive.writerNotebookPages.map(({ id }) => id));
  const assets = new Map(archive.writerNotebookAssets.map((asset) => [asset.id, asset]));
  for (const page of archive.writerNotebookPages) {
    invariant(notebooks.has(page.notebookId), `Notebook page ${page.id} references a missing notebook`);
    requirePageAsset({ page, assets, assetId: page.sourceAssetId, kind: 'source' });
    requirePageAsset({ page, assets, assetId: page.thumbnailAssetId, kind: 'thumbnail' });
    if (page.vectorAssetId) requirePageAsset({ page, assets, assetId: page.vectorAssetId, kind: 'vector' });
    invariant(Boolean(page.vectorAssetId) === Boolean(page.vectorisation), `Notebook page ${page.id} vector provenance is inconsistent`);
  }
  for (const asset of archive.writerNotebookAssets) {
    invariant(notebooks.has(asset.notebookId) && pages.has(asset.pageId), `Notebook asset ${asset.id} references a missing notebook or page`);
  }
};

/**
 * A truncated zip can lose records that nothing cross-references (a citation,
 * a palette, a whole doc); the manifest counts are the only way to notice.
 */
const checkCounts = (
  archive: ParsedSpaceArchive,
  inspectorConfigCount: number,
): void => {
  const expected = archive.manifest.counts;
  const found = actualCounts(archive, inspectorConfigCount);
  for (const table of COUNTED_TABLES) {
    invariant(
      found[table] === expected[table],
      `Archive record counts do not match its manifest: expected ` +
        `${String(expected[table])} ${table} record(s), found ${String(found[table])}`,
    );
  }
};

const checkReferences = (archive: ParsedSpaceArchive): void => {
  const spaceId = archive.space.id;
  const docIds = new Set(archive.docs.map((d) => d.id));
  const noteIds = new Set(archive.notes.map((n) => n.id));
  const scoped = [
    ...archive.sections,
    ...archive.docs,
    ...archive.notes,
    ...archive.attachments,
    ...archive.citations,
    ...archive.connections,
    ...archive.palettes,
    ...archive.writerNotebooks,
    ...archive.writerNotebookPages,
    ...archive.writerNotebookAssets,
  ];
  for (const record of scoped) {
    invariant(
      record.spaceId === spaceId,
      `Archive record ${record.id} belongs to a different space`,
    );
  }
  for (const a of archive.annotations) {
    invariant(docIds.has(a.docId), `Annotation ${a.id} references a missing doc`);
  }
  for (const r of archive.revisions) {
    invariant(docIds.has(r.docId), `Revision ${r.id} references a missing doc`);
  }
  for (const att of archive.attachments) {
    invariant(
      noteIds.has(att.noteId),
      `Attachment ${att.id} references a missing note`,
    );
  }
  for (const c of archive.connections) {
    invariant(
      noteIds.has(c.fromNoteId) && noteIds.has(c.toNoteId),
      `Connection ${c.id} references a missing note`,
    );
  }
  checkNotebookReferences(archive);
  checkNotebookLimits(archive);
};

const loadZip = async (blob: Blob): Promise<JSZip> => {
  try {
    // Load from bytes rather than the Blob: JSZip's Blob input needs a
    // same-realm FileReader, while byte arrays work everywhere.
    return await JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));
  } catch {
    throw new Error('Not a readable .zip archive');
  }
};

/**
 * Parses an untrusted space archive blob into validated records. Throws with
 * a descriptive message on any malformed, missing, or inconsistent content —
 * including v1 markdown-only zips, which have no manifest.
 */
export const parseSpaceArchive = async (
  blob: Blob,
): Promise<ParsedSpaceArchive> => {
  const zip = await loadZip(blob);
  invariant(
    zip.file(MANIFEST_FILENAME),
    'Not a Writer space archive — no manifest found (markdown-only exports cannot be restored)',
  );
  const manifest = parseManifest(await readJsonEntry(zip, MANIFEST_FILENAME));
  const space = parseSpaceRecord(
    await readJsonEntry(zip, `${RECORDS_DIR}/space.json`),
  );
  invariant(
    space.id === manifest.space.id,
    'Archive manifest does not match its space record',
  );
  const inspectorConfigs = await parseTable(
    zip,
    'docInspectorConfigs',
    parseDocInspectorConfigRecord,
  );
  for (const config of inspectorConfigs) {
    invariant(
      config.spaceId === space.id,
      'Archive doc-inspector config belongs to a different space',
    );
  }
  const archive: ParsedSpaceArchive = {
    manifest,
    space,
    sections: await parseTable(zip, 'sections', parseSectionRecord),
    docs: await parseTable(zip, 'docs', parseDocRecord),
    notes: await parseTable(zip, 'notes', parseNoteRecord),
    attachments: await bindAttachmentBlobs(zip, await parseAttachmentRecords(zip)),
    annotations: await parseTable(zip, 'annotations', parseAnnotationRecord),
    citations: await parseTable(zip, 'citations', parseCitationRecord),
    connections: await parseTable(zip, 'connections', parseConnectionRecord),
    revisions: await parseTable(zip, 'revisions', parseRevisionRecord),
    palettes: await parseTable(zip, 'palettes', parsePaletteRecord),
    writerNotebooks: await parseTable(zip, 'writerNotebooks', parseWriterNotebookRecord),
    writerNotebookPages: await parseTable(zip, 'writerNotebookPages', parseWriterNotebookPageRecord),
    writerNotebookAssets: await bindNotebookAssetBlobs(
      zip,
      await parseTable(zip, 'writerNotebookAssets', parseWriterNotebookAssetRecord),
    ),
    docInspectorConfig: inspectorConfigs[0] ?? null,
  };
  checkCounts(archive, inspectorConfigs.length);
  checkReferences(archive);
  return archive;
};
