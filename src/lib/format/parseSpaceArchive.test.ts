import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSpaceMarkdownZip,
  readSpaceSnapshot,
} from '@/lib/backup/buildSpaceMarkdownZip';
import {
  ATTACHMENT_BYTES,
  sampleAnnotation,
  sampleInspectorConfig,
  seedRichSpace,
} from '@/test/fixtures';
import { buildSpaceArchive } from './buildSpaceArchive';
import { parseSpaceArchive } from './parseSpaceArchive';

const WHEN = 1704067200000;

const rebuildWith = async (
  blob: Blob,
  mutate: (zip: JSZip) => void,
): Promise<Blob> => {
  const zip = await JSZip.loadAsync(new Uint8Array(await blob.arrayBuffer()));
  mutate(zip);
  return zip.generateAsync({ type: 'blob' });
};

describe('parseSpaceArchive', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('parses its own builder output back into equal records', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const archive = await parseSpaceArchive(await buildSpaceArchive(snapshot, WHEN));

    expect(archive.manifest.space.id).toBe('s1');
    expect(archive.space).toEqual(snapshot.space);
    expect(archive.sections).toEqual(expect.arrayContaining(snapshot.sections));
    expect(archive.docs).toEqual(snapshot.docs);
    expect(archive.notes).toEqual(expect.arrayContaining(snapshot.notes));
    expect(archive.annotations).toEqual(snapshot.annotations);
    expect(archive.citations).toEqual(snapshot.citations);
    expect(archive.connections).toEqual(snapshot.connections);
    expect(archive.revisions).toEqual(expect.arrayContaining(snapshot.revisions));
    expect(archive.palettes).toEqual(snapshot.palettes);
    expect(archive.docInspectorConfig).toEqual(snapshot.docInspectorConfig);

    expect(archive.attachments).toHaveLength(1);
    const attachment = archive.attachments[0];
    expect(attachment.id).toBe('att1');
    expect(attachment.blob.type).toBe('image/png');
    expect(await attachment.blob.text()).toBe(ATTACHMENT_BYTES);
  });

  it('rejects markdown-only (v1) zips with a clear message', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const v1 = await buildSpaceMarkdownZip(snapshot, WHEN);
    await expect(parseSpaceArchive(v1)).rejects.toThrow(/no manifest/i);
  });

  it('rejects blobs that are not zip archives', async () => {
    await expect(parseSpaceArchive(new Blob(['not a zip']))).rejects.toThrow(
      /not a readable \.zip/i,
    );
  });

  it('rejects archives with an unsupported format version', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'manifest.json',
          JSON.stringify({
            formatVersion: 99,
            exportedAt: WHEN,
            appVersion: '0.0.0',
            space: { id: 's1', tag: 'TST', name: 'Test Space' },
            counts: {},
          }),
        );
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(
      /unsupported archive format version 99/i,
    );
  });

  it('rejects archives with malformed records', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file('records/docs/d1.json', JSON.stringify({ id: 1 }));
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(/doc\.id/);
  });

  it('rejects archives with invalid JSON in a record', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file('records/citations/cit1.json', '{nope');
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(/not valid JSON/);
  });

  it('rejects archives whose records belong to a different space', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'records/citations/cit1.json',
          JSON.stringify({
            id: 'cit1',
            spaceId: 'other-space',
            key: 'k',
            authors: 'a',
            title: 't',
            year: 2020,
            type: 'misc',
            useCount: 0,
          }),
        );
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(/different space/);
  });

  it('rejects archives missing a referenced attachment asset', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.remove('assets/notes/n1/sketch.png');
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(
      /missing attachment asset/,
    );
  });

  it('rejects archives with dangling cross-references', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'records/annotations/ann1.json',
          JSON.stringify({ ...sampleAnnotation, docId: 'ghost-doc' }),
        );
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(
      /references a missing doc/,
    );
  });

  it('rejects truncated archives whose record counts disagree with the manifest', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    // A citation has no cross-references, so without the manifest count
    // check its loss would go unnoticed.
    const truncated = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.remove('records/citations/cit1.json');
      },
    );
    await expect(parseSpaceArchive(truncated)).rejects.toThrow(
      /counts do not match.*citations/,
    );

    const missingDoc = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.remove('records/docs/d1.json');
      },
    );
    await expect(parseSpaceArchive(missingDoc)).rejects.toThrow(
      /counts do not match.*docs/,
    );
  });

  it('rejects archives with extra records the manifest does not list', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const padded = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'records/palettes/pal-smuggled.json',
          JSON.stringify({ id: 'pal-smuggled', spaceId: 's1', slots: [] }),
        );
      },
    );
    await expect(parseSpaceArchive(padded)).rejects.toThrow(
      /counts do not match.*palettes/,
    );
  });

  it('rejects an inspector config scoped to a different space', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'records/docInspectorConfigs/s1.json',
          JSON.stringify({ ...sampleInspectorConfig, spaceId: 'other-space' }),
        );
      },
    );
    await expect(parseSpaceArchive(tampered)).rejects.toThrow(
      /doc-inspector config belongs to a different space/,
    );
  });

  it('tolerates docs whose section is absent (orphans are allowed in-app)', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const tampered = await rebuildWith(
      await buildSpaceArchive(snapshot, WHEN),
      (zip) => {
        zip.file(
          'records/docs/d1.json',
          JSON.stringify({ ...snapshot.docs[0], sectionId: 'ghost-section' }),
        );
      },
    );
    const archive = await parseSpaceArchive(tampered);
    expect(archive.docs[0].sectionId).toBe('ghost-section');
    expect(archive.sections.map((s) => s.id).sort()).toEqual(['sec1', 'sec1a']);
  });
});
