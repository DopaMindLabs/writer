import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import { readSpaceSnapshot } from '@/lib/backup/buildSpaceMarkdownZip';
import { ATTACHMENT_BYTES, seedRichSpace } from '@/test/fixtures';
import { buildSpaceArchive, buildSpaceArchiveFor } from './buildSpaceArchive';
import { parseNoteAttachmentRecord } from './codecs';

const WHEN = 1704067200000;

const loadZip = async (blob: Blob): Promise<JSZip> =>
  JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));

const names = (zip: JSZip): string[] =>
  Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => f.name);

describe('buildSpaceArchive', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('writes manifest, canonical records, and the markdown projection', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const zip = await loadZip(await buildSpaceArchive(snapshot, WHEN));
    const entries = names(zip);

    expect(entries).toContain('manifest.json');
    expect(entries).toContain('records/space.json');
    expect(entries).toContain('records/sections/sec1.json');
    expect(entries).toContain('records/sections/sec1a.json');
    expect(entries).toContain('records/docs/d1.json');
    expect(entries).toContain('records/notes/n1.json');
    expect(entries).toContain('records/notes/n2.json');
    expect(entries).toContain('records/noteAttachments/att1.json');
    expect(entries).toContain('records/annotations/ann1.json');
    expect(entries).toContain('records/citations/cit1.json');
    expect(entries).toContain('records/connections/c1.json');
    expect(entries).toContain('records/revisions/rev-base.json');
    expect(entries).toContain('records/revisions/rev-auto.json');
    expect(entries).toContain('records/revisions/rev-manual.json');
    expect(entries).toContain('records/palettes/pal1.json');
    expect(entries).toContain('records/docInspectorConfigs/s1.json');

    expect(entries).toContain('space.md');
    expect(entries).toContain('notes.md');
    expect(entries).toContain('citations.md');
  });

  it('stores the verbatim doc record including the Lexical body', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const zip = await loadZip(await buildSpaceArchive(snapshot, WHEN));
    const raw = JSON.parse(
      await zip.file('records/docs/d1.json')!.async('string'),
    ) as Record<string, unknown>;
    expect(raw).toEqual(snapshot.docs[0]);
  });

  it('points attachment records at the bundled binary asset', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const zip = await loadZip(await buildSpaceArchive(snapshot, WHEN));
    const record = parseNoteAttachmentRecord(
      JSON.parse(await zip.file('records/noteAttachments/att1.json')!.async('string')),
    );
    expect(record.assetPath).toBe('assets/notes/n1/sketch.png');
    const stored = await zip.file(record.assetPath)!.async('string');
    expect(stored).toBe(ATTACHMENT_BYTES);
  });

  it('buildSpaceArchiveFor returns blob, filename and snapshot for a space id', async () => {
    const { blob, filename, snapshot } = await buildSpaceArchiveFor('s1', WHEN);
    expect(filename).toMatch(/^test-space-2024-01-01-\d{4}\.zip$/);
    expect(snapshot.space.id).toBe('s1');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('omits the docInspectorConfigs record when the space has none', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const zip = await loadZip(
      await buildSpaceArchive({ ...snapshot, docInspectorConfig: null }, WHEN),
    );
    expect(names(zip)).not.toContain('records/docInspectorConfigs/s1.json');
  });
});
