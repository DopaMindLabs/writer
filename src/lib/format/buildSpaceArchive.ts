import JSZip from 'jszip';
import {
  backupFilename,
  generateZipBlob,
  readSpaceSnapshot,
  writeMarkdownProjection,
  type NoteAssets,
  type SpaceSnapshot,
} from '@/lib/backup/buildSpaceMarkdownZip';
import { buildManifest, MANIFEST_FILENAME } from './manifest';
import { serializeNoteAttachment } from './codecs';

export const RECORDS_DIR = 'records';

const recordPath = (table: string, id: string): string =>
  `${RECORDS_DIR}/${table}/${id}.json`;

const toJson = (record: unknown): string => JSON.stringify(record, null, 1);

const writeTable = (
  zip: JSZip,
  table: string,
  records: readonly { id: string }[],
): void => {
  for (const record of records) {
    zip.file(recordPath(table, record.id), toJson(record));
  }
};

const writeAttachmentRecords = (
  zip: JSZip,
  snapshot: SpaceSnapshot,
  assets: NoteAssets,
): void => {
  for (const attachment of snapshot.attachments) {
    const asset = assets.pathById.get(attachment.id);
    if (!asset) continue;
    zip.file(
      recordPath('noteAttachments', attachment.id),
      toJson(serializeNoteAttachment(attachment, asset.path)),
    );
  }
};

const writeRecords = (
  zip: JSZip,
  snapshot: SpaceSnapshot,
  assets: NoteAssets,
): void => {
  zip.file(`${RECORDS_DIR}/space.json`, toJson(snapshot.space));
  writeTable(zip, 'sections', snapshot.sections);
  writeTable(zip, 'docs', snapshot.docs);
  writeTable(zip, 'notes', snapshot.notes);
  writeAttachmentRecords(zip, snapshot, assets);
  writeTable(zip, 'annotations', snapshot.annotations);
  writeTable(zip, 'citations', snapshot.citations);
  writeTable(zip, 'connections', snapshot.connections);
  writeTable(zip, 'revisions', snapshot.revisions);
  writeTable(zip, 'palettes', snapshot.palettes);
  if (snapshot.docInspectorConfig) {
    zip.file(
      recordPath('docInspectorConfigs', snapshot.docInspectorConfig.spaceId),
      toJson(snapshot.docInspectorConfig),
    );
  }
};

/**
 * Builds a space archive: the human-readable markdown projection plus the
 * canonical per-record JSON layer (records/**) and a manifest. The records
 * layer is what Restore/Import read back; the markdown stays for humans.
 */
export const buildSpaceArchive = async (
  snapshot: SpaceSnapshot,
  when: number = Date.now(),
): Promise<Blob> => {
  const zip = new JSZip();
  const assets = writeMarkdownProjection(zip, snapshot, when);
  writeRecords(zip, snapshot, assets);
  zip.file(MANIFEST_FILENAME, toJson(buildManifest(snapshot, when)));
  return generateZipBlob(zip);
};

export const buildSpaceArchiveFor = async (
  spaceId: string,
  when: number = Date.now(),
): Promise<{ blob: Blob; filename: string; snapshot: SpaceSnapshot }> => {
  const snapshot = await readSpaceSnapshot(spaceId);
  const blob = await buildSpaceArchive(snapshot, when);
  const filename = backupFilename(snapshot.space.name, when);
  return { blob, filename, snapshot };
};
