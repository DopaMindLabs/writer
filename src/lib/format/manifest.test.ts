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
      annotations: 1,
      citations: 1,
      connections: 1,
      revisions: 3,
      palettes: 1,
    });
  });

  it('round-trips through JSON', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const manifest = buildManifest(snapshot, WHEN);
    expect(parseManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
  });

  it('rejects other format versions with a clear message', async () => {
    const snapshot = await readSpaceSnapshot('s1');
    const manifest = { ...buildManifest(snapshot, WHEN), formatVersion: 3 };
    expect(() => parseManifest(manifest)).toThrow(/Unsupported archive format/);
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
