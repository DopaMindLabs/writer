import { invariant } from '@/lib/invariant';
import { isDocStatus } from '@/lib/docInspector/status';
import type { HighlightColor } from '@/theme/tokens';
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
} from '@/db/schema';

/**
 * Record codecs for the space archive format (v2). Parsers treat their input
 * as untrusted (archives can come from anywhere) and validate every field via
 * invariant() before constructing a clean record object.
 */

export interface NoteAttachmentRecord {
  id: string;
  noteId: string;
  spaceId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: number;
  assetPath: string;
}

export const serializeNoteAttachment = (
  attachment: NoteAttachment,
  assetPath: string,
): NoteAttachmentRecord => ({
  id: attachment.id,
  noteId: attachment.noteId,
  spaceId: attachment.spaceId,
  name: attachment.name,
  mime: attachment.mime,
  size: attachment.size,
  createdAt: attachment.createdAt,
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

export const parseSpaceRecord = (value: unknown): Space => {
  const raw = asRaw(value, 'space');
  return {
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
    layout: layout === undefined ? undefined : readEnum(raw, 'layout', NOTE_LAYOUTS, 'note'),
    typeVersion: readOptionalString(raw, 'typeVersion', 'note'),
  };
};

export const parseNoteAttachmentRecord = (
  value: unknown,
): NoteAttachmentRecord => {
  const raw = asRaw(value, 'noteAttachment');
  return {
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

export const parseAnnotationRecord = (value: unknown): Annotation => {
  const raw = asRaw(value, 'annotation');
  const color = raw.color;
  return {
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
