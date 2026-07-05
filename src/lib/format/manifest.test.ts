import { beforeEach, describe, expect, it } from 'vitest';
import { readSpaceSnapshot } from '@/lib/backup/buildSpaceMarkdownZip';
import { seedRichSpace } from '@/test/fixtures';
import {
  ARCHIVE_FORMAT_VERSION,
  buildManifest,
  parseManifest,
} from './manifest';

const WHEN = 1704067200000;

describe('archive manifest', () => {
  beforeEach(async () => {
    await seedRichSpace();
  });

  it('builds a manifest with counts for every archived table', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const manifest = buildManifest(snapshot, WHEN);
    expect(manifest.formatVersion).toBe(ARCHIVE_FORMAT_VERSION);
    expect(manifest.exportedAt).toBe(WHEN);
    expect(manifest.space).toEqual({ id: 's1', tag: 'TST', name: 'Test Space' });
    expect(manifest.counts).toEqual({
      sections: 2,
      docs: 1,
      notes: 2,
      noteAttachments: 1,
      media: 0,
      pdfAnnotations: 0,
      annotations: 1,
      citations: 1,
      connections: 1,
      revisions: 3,
      palettes: 1,
      docInspectorConfigs: 1,
    });
  });

  it('round-trips through JSON', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const manifest = buildManifest(snapshot, WHEN);
    expect(parseManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it('rejects unsupported format versions with a clear message', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const manifest = { ...buildManifest(snapshot, WHEN), formatVersion: 99 };
    expect(() => parseManifest(manifest)).toThrow(/Unsupported archive format/);
  });

  it('reads a legacy v2 manifest (no v3 counts) as zero media and highlights', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const built = buildManifest(snapshot, WHEN);
    const v2 = JSON.parse(JSON.stringify(built)) as {
      formatVersion: number;
      counts: Record<string, number>;
    };
    v2.formatVersion = 2;
    delete v2.counts.media;
    delete v2.counts.pdfAnnotations;
    const parsed = parseManifest(v2);
    expect(parsed.formatVersion).toBe(2);
    expect(parsed.counts.media).toBe(0);
    expect(parsed.counts.pdfAnnotations).toBe(0);
  });

  it('rejects manifests with missing or malformed parts', () => {
    expect(() => parseManifest(null)).toThrow(/expected an object/);
    expect(() =>
      parseManifest({ formatVersion: ARCHIVE_FORMAT_VERSION, exportedAt: 'now' }),
    ).toThrow(/exportedAt/);
    expect(() =>
      parseManifest({
        formatVersion: ARCHIVE_FORMAT_VERSION,
        exportedAt: WHEN,
        appVersion: '0.0.0',
        space: { id: 's1', tag: 'T', name: 'N' },
        counts: { sections: -1 },
      }),
    ).toThrow(/counts\.sections/);
  });
});
