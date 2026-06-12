import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import type { ParsedSpaceArchive } from './parseSpaceArchive';

const IMPORT_TABLES = [
  db.spaces,
  db.sections,
  db.docs,
  db.notes,
  db.noteAttachments,
  db.annotations,
  db.citations,
  db.connections,
  db.revisions,
  db.palettes,
  db.docInspectorConfigs,
];

type IdMap = Map<string, string>;

const mapId = (ids: IdMap, oldId: string): string => {
  const existing = ids.get(oldId);
  if (existing) return existing;
  const fresh = newId();
  ids.set(oldId, fresh);
  return fresh;
};

const remapManuscript = (
  ids: IdMap,
  spaceId: string,
  archive: ParsedSpaceArchive,
): Pick<ParsedSpaceArchive, 'sections' | 'docs' | 'notes'> => ({
  sections: archive.sections.map((s) => ({
    ...s,
    id: mapId(ids, s.id),
    spaceId,
    parentSectionId:
      s.parentSectionId === null ? null : mapId(ids, s.parentSectionId),
  })),
  docs: archive.docs.map((d) => ({
    ...d,
    id: mapId(ids, d.id),
    spaceId,
    sectionId: mapId(ids, d.sectionId),
  })),
  notes: archive.notes.map((n) => ({
    ...n,
    id: mapId(ids, n.id),
    spaceId,
    linkedDocId:
      n.linkedDocId === undefined ? undefined : mapId(ids, n.linkedDocId),
  })),
});

const remapAnnex = (
  ids: IdMap,
  spaceId: string,
  archive: ParsedSpaceArchive,
): Pick<
  ParsedSpaceArchive,
  | 'attachments'
  | 'annotations'
  | 'citations'
  | 'connections'
  | 'revisions'
  | 'palettes'
  | 'docInspectorConfig'
> => ({
  attachments: archive.attachments.map((a) => ({
    ...a,
    id: mapId(ids, a.id),
    spaceId,
    noteId: mapId(ids, a.noteId),
  })),
  annotations: archive.annotations.map((a) => ({
    ...a,
    id: mapId(ids, a.id),
    docId: mapId(ids, a.docId),
  })),
  citations: archive.citations.map((c) => ({ ...c, id: mapId(ids, c.id), spaceId })),
  connections: archive.connections.map((c) => ({
    ...c,
    id: mapId(ids, c.id),
    spaceId,
    fromNoteId: mapId(ids, c.fromNoteId),
    toNoteId: mapId(ids, c.toNoteId),
  })),
  revisions: archive.revisions.map((r) => ({
    ...r,
    id: mapId(ids, r.id),
    docId: mapId(ids, r.docId),
  })),
  palettes: archive.palettes.map((p) => ({ ...p, id: mapId(ids, p.id), spaceId })),
  docInspectorConfig: archive.docInspectorConfig
    ? { ...archive.docInspectorConfig, spaceId }
    : null,
});

const remapArchive = (archive: ParsedSpaceArchive): ParsedSpaceArchive => {
  const ids: IdMap = new Map();
  const spaceId = mapId(ids, archive.space.id);
  return {
    manifest: archive.manifest,
    space: { ...archive.space, id: spaceId },
    ...remapManuscript(ids, spaceId, archive),
    ...remapAnnex(ids, spaceId, archive),
  };
};

const putRemapped = async (archive: ParsedSpaceArchive): Promise<void> => {
  await db.spaces.put(archive.space);
  await db.sections.bulkPut(archive.sections);
  await db.docs.bulkPut(archive.docs);
  await db.notes.bulkPut(archive.notes);
  await db.noteAttachments.bulkPut(archive.attachments);
  await db.annotations.bulkPut(archive.annotations);
  await db.citations.bulkPut(archive.citations);
  await db.connections.bulkPut(archive.connections);
  await db.revisions.bulkPut(archive.revisions);
  await db.palettes.bulkPut(archive.palettes);
  if (archive.docInspectorConfig) {
    await db.docInspectorConfigs.put(archive.docInspectorConfig);
  }
};

/**
 * Imports an archive as a brand-new space: every record id is remapped to a
 * fresh one (preserving all cross-references), so importing never collides
 * with existing data — including the space the archive was exported from.
 */
export const importSpaceArchive = async (
  archive: ParsedSpaceArchive,
): Promise<{ spaceId: string }> => {
  const remapped = remapArchive(archive);
  await db.transaction('rw', IMPORT_TABLES, async () => {
    await putRemapped(remapped);
  });
  return { spaceId: remapped.space.id };
};
