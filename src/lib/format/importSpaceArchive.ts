import { db } from '@/db/db';
import { newId } from '@/lib/ids';
import { createDocs, seedDocsCrdt } from '@/lib/docs';
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
  // createDocs writes the per-doc body-provenance baseline into `meta` in a
  // nested transaction, so `meta` must be part of this outer import transaction.
  db.meta,
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

/**
 * An imported space is a *new* space belonging to whoever imported it, so it
 * starts in their private realm. An archive taken from a shared space still
 * carries the exporter's `realmId` on every row; writing that through would
 * file the import into a realm the importer may not even belong to. Stripping
 * it here — at the single write step — means no per-table remap can forget it.
 */
const intoPrivateRealm = <T extends { realmId?: string }>(row: T): T => {
  const copy = { ...row };
  delete copy.realmId;
  return copy;
};

const putRemapped = async (archive: ParsedSpaceArchive): Promise<void> => {
  await db.spaces.put(intoPrivateRealm(archive.space));
  await db.sections.bulkPut(archive.sections.map(intoPrivateRealm));
  await createDocs(archive.docs.map(intoPrivateRealm));
  await db.notes.bulkPut(archive.notes.map(intoPrivateRealm));
  await db.noteAttachments.bulkPut(archive.attachments.map(intoPrivateRealm));
  await db.annotations.bulkPut(archive.annotations.map(intoPrivateRealm));
  await db.citations.bulkPut(archive.citations.map(intoPrivateRealm));
  await db.connections.bulkPut(archive.connections.map(intoPrivateRealm));
  await db.revisions.bulkPut(archive.revisions.map(intoPrivateRealm));
  await db.palettes.bulkPut(archive.palettes.map(intoPrivateRealm));
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
  // Seed CRDT state after the write commits — seeding runs a headless editor and
  // cannot execute inside the Dexie transaction.
  await seedDocsCrdt(remapped.docs);
  return { spaceId: remapped.space.id };
};
