import { invariant } from '@/lib/invariant';
import type { SpaceSnapshot } from '@/lib/backup/buildSpaceMarkdownZip';

export const ARCHIVE_FORMAT_VERSION = 2;
export const MANIFEST_FILENAME = 'manifest.json';

export interface ArchiveManifest {
  formatVersion: number;
  exportedAt: number;
  appVersion: string;
  space: { id: string; tag: string; name: string };
  counts: {
    sections: number;
    docs: number;
    notes: number;
    noteAttachments: number;
    annotations: number;
    citations: number;
    connections: number;
    revisions: number;
    palettes: number;
  };
}

export const buildManifest = (
  snapshot: SpaceSnapshot,
  exportedAt: number,
): ArchiveManifest => ({
  formatVersion: ARCHIVE_FORMAT_VERSION,
  exportedAt,
  appVersion: __APP_VERSION__,
  space: {
    id: snapshot.space.id,
    tag: snapshot.space.tag,
    name: snapshot.space.name,
  },
  counts: {
    sections: snapshot.sections.length,
    docs: snapshot.docs.length,
    notes: snapshot.notes.length,
    noteAttachments: snapshot.attachments.length,
    annotations: snapshot.annotations.length,
    citations: snapshot.citations.length,
    connections: snapshot.connections.length,
    revisions: snapshot.revisions.length,
    palettes: snapshot.palettes.length,
  },
});

const isRaw = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readCount = (raw: Record<string, unknown>, field: string): number => {
  const value = raw[field];
  invariant(
    typeof value === 'number' && Number.isInteger(value) && value >= 0,
    () => `manifest.counts.${field}: expected a non-negative integer`,
  );
  return value;
};

const parseCounts = (value: unknown): ArchiveManifest['counts'] => {
  invariant(isRaw(value), 'manifest.counts: expected an object');
  return {
    sections: readCount(value, 'sections'),
    docs: readCount(value, 'docs'),
    notes: readCount(value, 'notes'),
    noteAttachments: readCount(value, 'noteAttachments'),
    annotations: readCount(value, 'annotations'),
    citations: readCount(value, 'citations'),
    connections: readCount(value, 'connections'),
    revisions: readCount(value, 'revisions'),
    palettes: readCount(value, 'palettes'),
  };
};

const parseManifestSpace = (value: unknown): ArchiveManifest['space'] => {
  invariant(isRaw(value), 'manifest.space: expected an object');
  const { id, tag, name } = value;
  invariant(typeof id === 'string', 'manifest.space.id: expected a string');
  invariant(typeof tag === 'string', 'manifest.space.tag: expected a string');
  invariant(typeof name === 'string', 'manifest.space.name: expected a string');
  return { id, tag, name };
};

export const parseManifest = (value: unknown): ArchiveManifest => {
  invariant(isRaw(value), 'manifest: expected an object');
  const { formatVersion, exportedAt, appVersion } = value;
  invariant(
    typeof formatVersion === 'number',
    'manifest.formatVersion: expected a number',
  );
  invariant(
    formatVersion === ARCHIVE_FORMAT_VERSION,
    () =>
      `Unsupported archive format version ${String(formatVersion)} — ` +
      `this app reads version ${String(ARCHIVE_FORMAT_VERSION)}`,
  );
  invariant(
    typeof exportedAt === 'number' && Number.isFinite(exportedAt),
    'manifest.exportedAt: expected a number',
  );
  invariant(typeof appVersion === 'string', 'manifest.appVersion: expected a string');
  return {
    formatVersion,
    exportedAt,
    appVersion,
    space: parseManifestSpace(value.space),
    counts: parseCounts(value.counts),
  };
};
