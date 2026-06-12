import { db } from '@/db/db';
import {
  NoteKind,
  NoteState,
  type Annotation,
  type Citation,
  type Connection,
  type Doc,
  type DocInspectorConfig,
  type HighlightPalette,
  type Note,
  type NoteAttachment,
  type Revision,
  type Section,
  type Space,
} from '@/db/schema';

export const FIXED_TIME = 1704067200000;

export interface BodyBlock {
  text: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

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

export const sampleCitation: Citation = {
  id: 'cit1',
  spaceId: 's1',
  key: 'doe2020',
  authors: 'Doe, J.',
  title: 'On Bells',
  year: 2020,
  type: 'article',
  useCount: 2,
  raw: '@article{doe2020, title={On Bells}}',
};

export const sampleAnnotation: Annotation = {
  id: 'ann1',
  docId: 'd1',
  rangeStart: 0,
  rangeEnd: 4,
  kind: 'highlight',
  color: 'yellow',
  body: 'check this',
  author: 'me',
  createdAt: FIXED_TIME,
};

export const ATTACHMENT_BYTES = 'png-bytes';

export const sampleAttachment: NoteAttachment = {
  id: 'att1',
  noteId: 'n1',
  spaceId: 's1',
  name: 'sketch.png',
  mime: 'image/png',
  size: ATTACHMENT_BYTES.length,
  blob: new Blob([ATTACHMENT_BYTES], { type: 'image/png' }),
  createdAt: FIXED_TIME,
};

export const samplePalette: HighlightPalette = {
  id: 'pal1',
  spaceId: 's1',
  slots: [
    { name: 'Hero', color: '#ffcc00' },
    { name: 'Foil', color: '#33aaff' },
  ],
};

export const sampleInspectorConfig: DocInspectorConfig = {
  spaceId: 's1',
  wordLimit: 'on',
  charLimit: 'inherit',
  status: 'on',
  dueDate: 'off',
  highlightOverLimit: 'inherit',
  statusStages: { draft: true, complete: false },
};

/**
 * Seeds a space exercising every archivable table: nested sections, a doc
 * with body + revisions, two notes (one linked to the doc) with a connection,
 * an image attachment, an annotation, a citation, a palette, and a
 * doc-inspector config.
 */
export async function seedRichSpace() {
  await seedDocWithRevisions();
  await db.notes.put({
    ...sampleNote,
    id: 'n2',
    l: 240,
    t: 120,
    title: 'Second',
    linkedDocId: 'd1',
  });
  await db.connections.put({
    id: 'c1',
    spaceId: 's1',
    fromNoteId: 'n1',
    toNoteId: 'n2',
    createdAt: FIXED_TIME,
  });
  await db.noteAttachments.put(sampleAttachment);
  await db.annotations.put(sampleAnnotation);
  await db.citations.put(sampleCitation);
  await db.palettes.put(samplePalette);
  await db.docInspectorConfigs.put(sampleInspectorConfig);
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
