import { db } from '@/db/db';
import {
  NoteKind,
  NoteState,
  type Connection,
  type Doc,
  type Note,
  type Section,
  type Space,
} from '@/db/schema';

export const FIXED_TIME = 1704067200000; // 2024-01-01T00:00:00Z (Monday)

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

export async function seedBasicSpace() {
  await db.spaces.put(sampleSpace);
  await db.sections.bulkPut([sampleSection, sampleSubsection]);
  await db.docs.put(sampleDoc);
  await db.notes.put(sampleNote);
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
