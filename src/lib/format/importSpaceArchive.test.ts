import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import {
  readSpaceSnapshot,
  type SpaceSnapshot,
} from '@/lib/backup/buildSpaceMarkdownZip';
import { ATTACHMENT_BYTES, seedRichSpace } from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';
import { importSpaceArchive } from './importSpaceArchive';

const WHEN = 1704067200000;

const comparable = (snapshot: SpaceSnapshot): unknown => ({
  ...snapshot,
  attachments: snapshot.attachments.map((a) => ({ ...a, blob: undefined })),
});

describe('importSpaceArchive', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  const buildArchiveBlob = async (): Promise<Blob> =>
    buildSpaceArchive(await readSpaceSnapshot('s1'), WHEN);

  it('creates a new space with entirely fresh ids', async () => {
    const { spaceId } = await importSpaceArchive(
      await parseSpaceArchive(await buildArchiveBlob()),
    );

    expect(spaceId).not.toBe('s1');
    expect(await db.spaces.count()).toBe(2);

    const imported = await readSpaceSnapshot(spaceId);
    const originalIds = new Set([
      's1', 'sec1', 'sec1a', 'd1', 'n1', 'n2', 'c1', 'att1', 'ann1', 'cit1',
      'pal1', 'rev-base', 'rev-auto', 'rev-manual',
    ]);
    const importedIds = [
      imported.space.id,
      ...imported.sections.map((r) => r.id),
      ...imported.docs.map((r) => r.id),
      ...imported.notes.map((r) => r.id),
      ...imported.attachments.map((r) => r.id),
      ...imported.annotations.map((r) => r.id),
      ...imported.citations.map((r) => r.id),
      ...imported.connections.map((r) => r.id),
      ...imported.revisions.map((r) => r.id),
      ...imported.palettes.map((r) => r.id),
    ];
    for (const id of importedIds) {
      expect(originalIds.has(id)).toBe(false);
    }
    expect(new Set(importedIds).size).toBe(importedIds.length);
  });

  it('preserves every cross-reference through the remap', async () => {
    const { spaceId } = await importSpaceArchive(
      await parseSpaceArchive(await buildArchiveBlob()),
    );
    const s = await readSpaceSnapshot(spaceId);

    const sectionIds = new Set(s.sections.map((r) => r.id));
    const docIds = new Set(s.docs.map((r) => r.id));
    const noteIds = new Set(s.notes.map((r) => r.id));

    const child = s.sections.find((r) => r.parentSectionId !== null);
    expect(child).toBeDefined();
    expect(sectionIds.has(child!.parentSectionId!)).toBe(true);
    expect(sectionIds.has(s.docs[0].sectionId)).toBe(true);

    const linked = s.notes.find((n) => n.linkedDocId !== undefined);
    expect(linked).toBeDefined();
    expect(docIds.has(linked!.linkedDocId!)).toBe(true);

    expect(noteIds.has(s.attachments[0].noteId)).toBe(true);
    expect(docIds.has(s.annotations[0].docId)).toBe(true);
    expect(noteIds.has(s.connections[0].fromNoteId)).toBe(true);
    expect(noteIds.has(s.connections[0].toNoteId)).toBe(true);
    for (const revision of s.revisions) {
      expect(docIds.has(revision.docId)).toBe(true);
    }
    expect(s.docInspectorConfig?.spaceId).toBe(spaceId);
    expect(await s.attachments[0].blob.text()).toBe(ATTACHMENT_BYTES);
  });

  it('leaves the original space untouched', async () => {
    const before = await readSpaceSnapshot('s1');
    await importSpaceArchive(await parseSpaceArchive(await buildArchiveBlob()));
    const after = await readSpaceSnapshot('s1');
    expect(comparable(after)).toEqual(comparable(before));
  });

  it('imports into an empty database (the cross-device case)', async () => {
    const blob = await buildArchiveBlob();
    await Promise.all(db.tables.map((t) => t.clear()));

    const { spaceId } = await importSpaceArchive(await parseSpaceArchive(blob));
    const s = await readSpaceSnapshot(spaceId);
    expect(s.space.name).toBe('Test Space');
    expect(s.docs).toHaveLength(1);
    expect(s.notes).toHaveLength(2);
    expect(s.revisions).toHaveLength(3);
  });
});
