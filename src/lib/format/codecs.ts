import { invariant } from '@/lib/invariant';
import { isDocStatus } from '@/lib/docInspector/status';
import type { HighlightColor } from '@/theme/tokens';
import { asOperationId, asPrincipalId } from 'writer-sync/core';
import type { ReplicatedEntityMetadata } from 'writer-sync/core';
import {
  NoteKind,
  NoteLayout,
  NoteState,
  type Annotation,
  type Citation,
  type Connection,
  type Doc,
  type DocInspectorConfig,
  type HighlightPalette,
  type InspectorToggle,
  type Note,
  type NoteAttachment,
  type Revision,
  type RevisionKind,
  type Section,
  type Space,
  type WriterNotebook,
  type WriterNotebookAsset,
  type WriterNotebookPage,
} from '@/db/schema';

/**
 * Record codecs for the space archive format (v3). Parsers treat their input
 * as untrusted (archives can come from anywhere) and validate every field via
 * invariant() before constructing a clean record object.
 */

export interface NoteAttachmentRecord extends ReplicatedEntityMetadata {
  id: string;
  noteId: string;
  spaceId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
  assetPath: string;
}

export interface WriterNotebookAssetRecord extends ReplicatedEntityMetadata {
  id: string;
  notebookId: string;
  pageId: string;
  spaceId: string;
  kind: WriterNotebookAsset['kind'];
  mime: string;
  size: number;
  createdAt: number;
  assetPath: string;
}

export const serializeNoteAttachment = (
  attachment: NoteAttachment,
  assetPath: string,
): NoteAttachmentRecord => ({
  accessScopeId: attachment.accessScopeId,
  createdBy: attachment.createdBy,
  updatedBy: attachment.updatedBy,
  mutationId: attachment.mutationId,
  logicalUpdatedAt: attachment.logicalUpdatedAt,
  id: attachment.id,
  noteId: attachment.noteId,
  spaceId: attachment.spaceId,
  name: attachment.name,
  mime: attachment.mime,
  size: attachment.size,
  createdAt: attachment.createdAt,
  assetPath,
});

export const serializeWriterNotebookAsset = (
  asset: WriterNotebookAsset,
  assetPath: string,
): WriterNotebookAssetRecord => ({
  accessScopeId: asset.accessScopeId,
  createdBy: asset.createdBy,
  updatedBy: asset.updatedBy,
  mutationId: asset.mutationId,
  logicalUpdatedAt: asset.logicalUpdatedAt,
  id: asset.id,
  notebookId: asset.notebookId,
  pageId: asset.pageId,
  spaceId: asset.spaceId,
  kind: asset.kind,
  mime: asset.mime,
  size: asset.size,
  createdAt: asset.createdAt,
  assetPath,
});

const isRaw = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRaw = (value: unknown, label: string): Record<string, unknown> => {
  invariant(isRaw(value), `${label}: expected an object`);
  return value;
};

const readString = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): string => {
  const value = raw[field];
  invariant(typeof value === 'string', `${label}.${field}: expected a string`);
  return value;
};

const readNumber = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): number => {
  const value = raw[field];
  invariant(
    typeof value === 'number' && Number.isFinite(value),
    `${label}.${field}: expected a finite number`,
  );
  return value;
};

const readBoolean = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): boolean => {
  const value = raw[field];
  invariant(typeof value === 'boolean', `${label}.${field}: expected a boolean`);
  return value;
};

const readOptionalString = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): string | undefined => {
  if (raw[field] === undefined) return undefined;
  return readString(raw, field, label);
};

const readOptionalNumber = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): number | undefined => {
  if (raw[field] === undefined) return undefined;
  return readNumber(raw, field, label);
};

const readOptionalBoolean = (
  raw: Record<string, unknown>,
  field: string,
  label: string,
): boolean | undefined => {
  if (raw[field] === undefined) return undefined;
  return readBoolean(raw, field, label);
};

const isOneOf = <T extends string>(
  value: unknown,
  values: readonly T[],
): value is T => values.some((candidate) => candidate === value);

const readEnum = <T extends string>(
  raw: Record<string, unknown>,
  field: string,
  values: readonly T[],
  label: string,
): T => {
  const value = raw[field];
  invariant(
    isOneOf(value, values),
    `${label}.${field}: expected one of ${values.join(', ')}`,
  );
  return value;
};

/**
 * The provider-neutral sync metadata every archived content record carries
 * (v3 archives serialise rows wholesale, so the fields are always present).
 * Validated as strictly as any other field: an archive is untrusted input.
 */
const parseEntityMetadata = (
  raw: Record<string, unknown>,
  label: string,
): ReplicatedEntityMetadata => {
  const at = asRaw(raw.logicalUpdatedAt, `${label}.logicalUpdatedAt`);
  return {
    accessScopeId: readString(raw, 'accessScopeId', label),
    createdBy: asPrincipalId(readString(raw, 'createdBy', label)),
    updatedBy: asPrincipalId(readString(raw, 'updatedBy', label)),
    mutationId: asOperationId(readString(raw, 'mutationId', label)),
    logicalUpdatedAt: {
      millis: readNumber(at, 'millis', `${label}.logicalUpdatedAt`),
      counter: readNumber(at, 'counter', `${label}.logicalUpdatedAt`),
    },
  };
};

const NOTE_KINDS: readonly NoteKind[] = Object.values(NoteKind);
const NOTE_STATES: readonly NoteState[] = Object.values(NoteState);
const NOTE_LAYOUTS: readonly NoteLayout[] = Object.values(NoteLayout);
const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  'yellow',
  'pink',
  'blue',
  'green',
  'ash',
];
const ANNOTATION_KINDS: readonly Annotation['kind'][] = [
  'highlight',
  'inline',
  'side',
];
const CITATION_TYPES: readonly Citation['type'][] = [
  'book',
  'article',
  'chapter',
  'misc',
];
const REVISION_KINDS: readonly RevisionKind[] = ['auto', 'manual', 'baseline'];
const INSPECTOR_TOGGLES: readonly InspectorToggle[] = ['on', 'off', 'inherit'];
const NOTEBOOK_ASSET_KINDS: readonly WriterNotebookAsset['kind'][] = [
  'source',
  'thumbnail',
  'vector',
];

export const parseSpaceRecord = (value: unknown): Space => {
  const raw = asRaw(value, 'space');
  return {
    ...parseEntityMetadata(raw, 'space'),
    id: readString(raw, 'id', 'space'),
    tag: readString(raw, 'tag', 'space'),
    name: readString(raw, 'name', 'space'),
    shared: readBoolean(raw, 'shared', 'space'),
    template: readString(raw, 'template', 'space'),
    createdAt: readNumber(raw, 'createdAt', 'space'),
    updatedAt: readNumber(raw, 'updatedAt', 'space'),
  };
};

export const parseSectionRecord = (value: unknown): Section => {
  const raw = asRaw(value, 'section');
  const parent = raw.parentSectionId;
  invariant(
    parent === null || typeof parent === 'string',
    'section.parentSectionId: expected a string or null',
  );
  return {
    ...parseEntityMetadata(raw, 'section'),
    id: readString(raw, 'id', 'section'),
    spaceId: readString(raw, 'spaceId', 'section'),
    parentSectionId: parent,
    label: readString(raw, 'label', 'section'),
    order: readNumber(raw, 'order', 'section'),
  };
};

const parseDocMeta = (value: unknown): Doc['meta'] => {
  const raw = asRaw(value, 'doc.meta');
  return {
    wordCount: readNumber(raw, 'wordCount', 'doc.meta'),
    status: readOptionalString(raw, 'status', 'doc.meta'),
    wordLimit: readOptionalNumber(raw, 'wordLimit', 'doc.meta'),
    charLimit: readOptionalNumber(raw, 'charLimit', 'doc.meta'),
    dueDate: readOptionalNumber(raw, 'dueDate', 'doc.meta'),
  };
};

export const parseDocRecord = (value: unknown): Doc => {
  const raw = asRaw(value, 'doc');
  return {
    ...parseEntityMetadata(raw, 'doc'),
    id: readString(raw, 'id', 'doc'),
    spaceId: readString(raw, 'spaceId', 'doc'),
    sectionId: readString(raw, 'sectionId', 'doc'),
    name: readString(raw, 'name', 'doc'),
    body: readString(raw, 'body', 'doc'),
    meta: parseDocMeta(raw.meta),
    updatedAt: readNumber(raw, 'updatedAt', 'doc'),
  };
};

export const parseNoteRecord = (value: unknown): Note => {
  const raw = asRaw(value, 'note');
  const layout = raw.layout;
  return {
    ...parseEntityMetadata(raw, 'note'),
    id: readString(raw, 'id', 'note'),
    spaceId: readString(raw, 'spaceId', 'note'),
    l: readNumber(raw, 'l', 'note'),
    t: readNumber(raw, 't', 'note'),
    w: readNumber(raw, 'w', 'note'),
    h: readNumber(raw, 'h', 'note'),
    kind: readEnum(raw, 'kind', NOTE_KINDS, 'note'),
    state: readEnum(raw, 'state', NOTE_STATES, 'note'),
    title: readOptionalString(raw, 'title', 'note'),
    body: readString(raw, 'body', 'note'),
    linkedDocId: readOptionalString(raw, 'linkedDocId', 'note'),
    createdAt: readNumber(raw, 'createdAt', 'note'),
    openedAt: readOptionalNumber(raw, 'openedAt', 'note'),
    layout: layout === undefined ? undefined : readEnum(raw, 'layout', NOTE_LAYOUTS, 'note'),
    typeVersion: readOptionalString(raw, 'typeVersion', 'note'),
  };
};

export const parseNoteAttachmentRecord = (
  value: unknown,
): NoteAttachmentRecord => {
  const raw = asRaw(value, 'noteAttachment');
  return {
    ...parseEntityMetadata(raw, 'noteAttachment'),
    id: readString(raw, 'id', 'noteAttachment'),
    noteId: readString(raw, 'noteId', 'noteAttachment'),
    spaceId: readString(raw, 'spaceId', 'noteAttachment'),
    name: readString(raw, 'name', 'noteAttachment'),
    mime: readString(raw, 'mime', 'noteAttachment'),
    size: readNumber(raw, 'size', 'noteAttachment'),
    createdAt: readNumber(raw, 'createdAt', 'noteAttachment'),
    assetPath: readString(raw, 'assetPath', 'noteAttachment'),
  };
};

export const parseWriterNotebookRecord = (value: unknown): WriterNotebook => {
  const raw = asRaw(value, 'writerNotebook');
  return {
    ...parseEntityMetadata(raw, 'writerNotebook'),
    id: readString(raw, 'id', 'writerNotebook'),
    spaceId: readString(raw, 'spaceId', 'writerNotebook'),
    title: readString(raw, 'title', 'writerNotebook'),
    createdAt: readNumber(raw, 'createdAt', 'writerNotebook'),
    updatedAt: readNumber(raw, 'updatedAt', 'writerNotebook'),
  };
};

const parsePageRotation = (value: unknown): WriterNotebookPage['rotation'] => {
  if (value === 0 || value === 90 || value === 180 || value === 270) return value;
  throw new TypeError('writerNotebookPage.rotation: expected 0, 90, 180, or 270');
};

const parseVectorisation = (
  value: unknown,
): NonNullable<WriterNotebookPage['vectorisation']> => {
  const raw = asRaw(value, 'writerNotebookPage.vectorisation');
  return {
    engine: readString(raw, 'engine', 'writerNotebookPage.vectorisation'),
    engineVersion: readString(raw, 'engineVersion', 'writerNotebookPage.vectorisation'),
    preset: readString(raw, 'preset', 'writerNotebookPage.vectorisation'),
    presetVersion: readNumber(raw, 'presetVersion', 'writerNotebookPage.vectorisation'),
  };
};

export const parseWriterNotebookPageRecord = (value: unknown): WriterNotebookPage => {
  const raw = asRaw(value, 'writerNotebookPage');
  return {
    ...parseEntityMetadata(raw, 'writerNotebookPage'),
    id: readString(raw, 'id', 'writerNotebookPage'),
    notebookId: readString(raw, 'notebookId', 'writerNotebookPage'),
    spaceId: readString(raw, 'spaceId', 'writerNotebookPage'),
    order: readNumber(raw, 'order', 'writerNotebookPage'),
    sourceAssetId: readString(raw, 'sourceAssetId', 'writerNotebookPage'),
    thumbnailAssetId: readString(raw, 'thumbnailAssetId', 'writerNotebookPage'),
    vectorAssetId: readOptionalString(raw, 'vectorAssetId', 'writerNotebookPage'),
    width: readNumber(raw, 'width', 'writerNotebookPage'),
    height: readNumber(raw, 'height', 'writerNotebookPage'),
    rotation: parsePageRotation(raw.rotation),
    createdAt: readNumber(raw, 'createdAt', 'writerNotebookPage'),
    updatedAt: readNumber(raw, 'updatedAt', 'writerNotebookPage'),
    vectorisation:
      raw.vectorisation === undefined ? undefined : parseVectorisation(raw.vectorisation),
  };
};

export const parseWriterNotebookAssetRecord = (
  value: unknown,
): WriterNotebookAssetRecord => {
  const raw = asRaw(value, 'writerNotebookAsset');
  return {
    ...parseEntityMetadata(raw, 'writerNotebookAsset'),
    id: readString(raw, 'id', 'writerNotebookAsset'),
    notebookId: readString(raw, 'notebookId', 'writerNotebookAsset'),
    pageId: readString(raw, 'pageId', 'writerNotebookAsset'),
    spaceId: readString(raw, 'spaceId', 'writerNotebookAsset'),
    kind: readEnum(raw, 'kind', NOTEBOOK_ASSET_KINDS, 'writerNotebookAsset'),
    mime: readString(raw, 'mime', 'writerNotebookAsset'),
    size: readNumber(raw, 'size', 'writerNotebookAsset'),
    createdAt: readNumber(raw, 'createdAt', 'writerNotebookAsset'),
    assetPath: readString(raw, 'assetPath', 'writerNotebookAsset'),
  };
};

export const parseAnnotationRecord = (value: unknown): Annotation => {
  const raw = asRaw(value, 'annotation');
  const color = raw.color;
  return {
    ...parseEntityMetadata(raw, 'annotation'),
    id: readString(raw, 'id', 'annotation'),
    docId: readString(raw, 'docId', 'annotation'),
    rangeStart: readNumber(raw, 'rangeStart', 'annotation'),
    rangeEnd: readNumber(raw, 'rangeEnd', 'annotation'),
    kind: readEnum(raw, 'kind', ANNOTATION_KINDS, 'annotation'),
    color:
      color === undefined
        ? undefined
        : readEnum(raw, 'color', HIGHLIGHT_COLORS, 'annotation'),
    body: readOptionalString(raw, 'body', 'annotation'),
    author: readString(raw, 'author', 'annotation'),
    createdAt: readNumber(raw, 'createdAt', 'annotation'),
  };
};

export const parseCitationRecord = (value: unknown): Citation => {
  const raw = asRaw(value, 'citation');
  return {
    ...parseEntityMetadata(raw, 'citation'),
    id: readString(raw, 'id', 'citation'),
    spaceId: readString(raw, 'spaceId', 'citation'),
    key: readString(raw, 'key', 'citation'),
    authors: readString(raw, 'authors', 'citation'),
    title: readString(raw, 'title', 'citation'),
    year: readNumber(raw, 'year', 'citation'),
    type: readEnum(raw, 'type', CITATION_TYPES, 'citation'),
    useCount: readNumber(raw, 'useCount', 'citation'),
    raw: readOptionalString(raw, 'raw', 'citation'),
  };
};

export const parseConnectionRecord = (value: unknown): Connection => {
  const raw = asRaw(value, 'connection');
  return {
    ...parseEntityMetadata(raw, 'connection'),
    id: readString(raw, 'id', 'connection'),
    spaceId: readString(raw, 'spaceId', 'connection'),
    fromNoteId: readString(raw, 'fromNoteId', 'connection'),
    toNoteId: readString(raw, 'toNoteId', 'connection'),
    createdAt: readNumber(raw, 'createdAt', 'connection'),
  };
};

export const parseRevisionRecord = (value: unknown): Revision => {
  const raw = asRaw(value, 'revision');
  const meta = raw.meta;
  invariant(
    meta === undefined || isRaw(meta),
    'revision.meta: expected an object',
  );
  return {
    ...parseEntityMetadata(raw, 'revision'),
    id: readString(raw, 'id', 'revision'),
    docId: readString(raw, 'docId', 'revision'),
    body: readString(raw, 'body', 'revision'),
    text: readString(raw, 'text', 'revision'),
    wordCount: readNumber(raw, 'wordCount', 'revision'),
    kind: readEnum(raw, 'kind', REVISION_KINDS, 'revision'),
    label: readOptionalString(raw, 'label', 'revision'),
    pinned: readOptionalBoolean(raw, 'pinned', 'revision'),
    createdAt: readNumber(raw, 'createdAt', 'revision'),
    meta: meta === undefined ? undefined : { ...meta },
  };
};

const parsePaletteSlot = (
  value: unknown,
): HighlightPalette['slots'][number] => {
  const raw = asRaw(value, 'palette.slot');
  return {
    name: readString(raw, 'name', 'palette.slot'),
    color: readString(raw, 'color', 'palette.slot'),
  };
};

export const parsePaletteRecord = (value: unknown): HighlightPalette => {
  const raw = asRaw(value, 'palette');
  const slots = raw.slots;
  invariant(Array.isArray(slots), 'palette.slots: expected an array');
  return {
    ...parseEntityMetadata(raw, 'palette'),
    id: readString(raw, 'id', 'palette'),
    spaceId: readString(raw, 'spaceId', 'palette'),
    slots: slots.map(parsePaletteSlot),
  };
};

const parseStatusStages = (
  value: unknown,
): DocInspectorConfig['statusStages'] => {
  if (value === undefined) return undefined;
  const raw = asRaw(value, 'docInspectorConfig.statusStages');
  const stages: NonNullable<DocInspectorConfig['statusStages']> = {};
  for (const [key, enabled] of Object.entries(raw)) {
    invariant(
      isDocStatus(key),
      `docInspectorConfig.statusStages: unknown stage "${key}"`,
    );
    invariant(
      typeof enabled === 'boolean',
      `docInspectorConfig.statusStages.${key}: expected a boolean`,
    );
    stages[key] = enabled;
  }
  return stages;
};

export const parseDocInspectorConfigRecord = (
  value: unknown,
): DocInspectorConfig => {
  const raw = asRaw(value, 'docInspectorConfig');
  const label = 'docInspectorConfig';
  return {
    spaceId: readString(raw, 'spaceId', label),
    wordLimit: readEnum(raw, 'wordLimit', INSPECTOR_TOGGLES, label),
    charLimit: readEnum(raw, 'charLimit', INSPECTOR_TOGGLES, label),
    status: readEnum(raw, 'status', INSPECTOR_TOGGLES, label),
    dueDate: readEnum(raw, 'dueDate', INSPECTOR_TOGGLES, label),
    highlightOverLimit: readEnum(raw, 'highlightOverLimit', INSPECTOR_TOGGLES, label),
    statusStages: parseStatusStages(raw.statusStages),
  };
};
