import { db } from '@/db/db';
import {
  NoteKind,
  NoteState,
  type Connection,
  type Doc,
  type Note,
  type Revision,
  type Section,
  type Space,
} from '@/db/schema';

export const FIXED_TIME = 1704067200000; // 2024-01-01T00:00:00Z (Monday)

export interface BodyBlock {
  text: string;
  /** When set, the block is a heading of that tag; otherwise a paragraph. */
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

/**
 * Builds a real serialized Lexical doc body from typed blocks (headings and
 * paragraphs), shaped like serializeState output. Doc bodies are always
 * serialized JSON or '' — never plain text — so fixtures must use this (or
 * serializedBody below) rather than raw strings.
 */
export const serializedBlocks = (blocks: BodyBlock[]): string =>
  JSON.stringify({
    root: {
      children: blocks.map(({ text, tag }) => ({
        children: text
          ? [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text,
                type: 'text',
                version: 1,
              },
            ]
          : [],
        direction: 'ltr',
        format: '',
        indent: 0,
        ...(tag ? { type: 'heading', tag } : { type: 'paragraph' }),
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  });

/** Builds a serialized Lexical doc body of one paragraph per line of `text`. */
export const serializedBody = (text: string): string =>
  serializedBlocks(text.split('\n').map((line) => ({ text: line })));

export const sampleSpace: Space = {
  id: 's1',
  tag: 'TST',
  name: 'Test Space',
  shared: false,
  template: 'blank',
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
};

export const sampleSection: Section = {
  id: 'sec1',
  spaceId: 's1',
  parentSectionId: null,
  label: 'Drafts',
  order: 0,
};

export const sampleSubsection: Section = {
  id: 'sec1a',
  spaceId: 's1',
  parentSectionId: 'sec1',
  label: 'Ideas',
  order: 0,
};

export const sampleDoc: Doc = {
  id: 'd1',
  spaceId: 's1',
  sectionId: 'sec1',
  name: 'Sample Doc',
  body: '',
  meta: { wordCount: 0 },
  updatedAt: FIXED_TIME,
};

export const sampleNote: Note = {
  id: 'n1',
  spaceId: 's1',
  l: 24,
  t: 24,
  w: 184,
  h: 80,
  kind: NoteKind.Note,
  state: NoteState.User,
  body: 'Hello',
  createdAt: FIXED_TIME,
};

export const sampleRevision: Revision = {
  id: 'rev1',
  docId: 'd1',
  body: serializedBody('First draft.'),
  text: 'First draft.',
  wordCount: 2,
  kind: 'baseline',
  createdAt: FIXED_TIME,
};

export async function seedBasicSpace() {
  await db.spaces.put(sampleSpace);
  await db.sections.bulkPut([sampleSection, sampleSubsection]);
  await db.docs.put(sampleDoc);
  await db.notes.put(sampleNote);
}

export async function seedDocWithRevisions() {
  await seedBasicSpace();
  await db.docs.put({
    ...sampleDoc,
    body: serializedBody('The bell rang twice across the quiet valley.'),
    meta: { wordCount: 8 },
  });
  await db.revisions.bulkPut([
    {
      ...sampleRevision,
      id: 'rev-base',
      kind: 'baseline',
      text: 'The bell rang once.',
      body: serializedBody('The bell rang once.'),
      wordCount: 4,
      createdAt: FIXED_TIME,
    },
    {
      ...sampleRevision,
      id: 'rev-auto',
      kind: 'auto',
      text: 'The bell rang twice across the valley.',
      body: serializedBody('The bell rang twice across the valley.'),
      wordCount: 7,
      createdAt: FIXED_TIME + 600_000,
    },
    {
      ...sampleRevision,
      id: 'rev-manual',
      kind: 'manual',
      label: 'before review',
      pinned: true,
      text: 'The bell rang twice across the quiet valley.',
      body: serializedBody('The bell rang twice across the quiet valley.'),
      wordCount: 8,
      createdAt: FIXED_TIME + 1_200_000,
    },
  ]);
}

export async function seedMultipleSpaces() {
  await db.spaces.bulkPut([
    { ...sampleSpace, id: 's1', tag: 'AAA', name: 'Alpha' },
    { ...sampleSpace, id: 's2', tag: 'BBB', name: 'Beta', shared: true },
    { ...sampleSpace, id: 's3', tag: 'CCC', name: 'Gamma' },
  ]);
}

export async function seedBrainSpaceCanvas() {
  await db.spaces.put(sampleSpace);
  const n1: Note = { ...sampleNote, id: 'n1' };
  const n2: Note = { ...sampleNote, id: 'n2', l: 240, t: 120 };
  await db.notes.bulkPut([n1, n2]);
  const conn: Connection = {
    id: 'c1',
    spaceId: 's1',
    fromNoteId: 'n1',
    toNoteId: 'n2',
    createdAt: FIXED_TIME,
  };
  await db.connections.put(conn);
}
