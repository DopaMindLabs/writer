import { db } from './db';
import {
  createSpaceFromTemplate,
  deleteNoteWithCascade,
  seedIfEmpty,
} from './seed';
import { NoteKind, NoteState } from './schema';
import type { Template } from '@/data/templates';
import { FIXED_TIME } from '@/test/fixtures';

const TEST_TEMPLATE: Template = {
  id: 'test-tpl',
  label: 'Test Template',
  tag: 'tst',
  version: '0.1.0',
  enabled: true,
  pickerOrder: 0,
  sections: [
    {
      label: 'Drafts',
      order: 0,
      sections: [{ label: 'Ideas', order: 0 }],
    },
    { label: 'Final', order: 1 },
  ],
  seedDocs: [
    { sectionLabel: 'Drafts', name: 'Doc A' },
    { sectionLabel: 'Drafts', subsectionLabel: 'Ideas', name: 'Doc B', body: 'b' },
    { sectionLabel: 'Final', name: 'Doc C' },
    { sectionLabel: 'Nonexistent', name: 'Skipped' },
  ],
  seedNotes: [
    {
      l: 10,
      t: 20,
      w: 100,
      h: 60,
      kind: NoteKind.Note,
      title: 'Seed',
      body: 'hello',
    },
  ],
  noteKinds: [NoteKind.Blank],
};

describe('createSpaceFromTemplate', () => {
  it('seeds space, sections, docs, notes from the template', async () => {
    const id = await createSpaceFromTemplate(TEST_TEMPLATE);
    expect(await db.spaces.count()).toBe(1);
    const space = await db.spaces.get(id);
    expect(space?.tag).toBe('TST');
    expect(space?.template).toBe('test-tpl');

    const sections = await db.sections.where('spaceId').equals(id).toArray();
    expect(sections).toHaveLength(3); // Drafts + Ideas + Final
    const drafts = sections.find((s) => s.label === 'Drafts');
    const ideas = sections.find((s) => s.label === 'Ideas');
    expect(ideas?.parentSectionId).toBe(drafts?.id);

    const docs = await db.docs.where('spaceId').equals(id).toArray();
    expect(docs).toHaveLength(3); // Skipped doc has unknown section
    expect(docs.some((d) => d.body === 'b')).toBe(true);

    const notes = await db.notes.where('spaceId').equals(id).toArray();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.state).toBe(NoteState.User);
    expect(notes[0]?.title).toBe('Seed');
  });

  it('respects name and tagOverride parameters', async () => {
    const id = await createSpaceFromTemplate(
      TEST_TEMPLATE,
      'My Space',
      'xyz',
    );
    const space = await db.spaces.get(id);
    expect(space?.name).toBe('My Space');
    expect(space?.tag).toBe('XYZ');
  });
});

describe('seedIfEmpty', () => {
  it('seeds on first call and is idempotent on second', async () => {
    await seedIfEmpty();
    const spaceCount = await db.spaces.count();
    expect(spaceCount).toBeGreaterThan(0);

    await seedIfEmpty();
    expect(await db.spaces.count()).toBe(spaceCount);
  });
});

describe('deleteNoteWithCascade', () => {
  it('removes connections referencing the deleted note from either end', async () => {
    await db.notes.bulkPut([
      {
        id: 'n1',
        spaceId: 's1',
        l: 0,
        t: 0,
        w: 100,
        h: 60,
        kind: NoteKind.Note,
        state: NoteState.User,
        body: '',
        createdAt: FIXED_TIME,
      },
      {
        id: 'n2',
        spaceId: 's1',
        l: 0,
        t: 0,
        w: 100,
        h: 60,
        kind: NoteKind.Note,
        state: NoteState.User,
        body: '',
        createdAt: FIXED_TIME,
      },
      {
        id: 'n3',
        spaceId: 's1',
        l: 0,
        t: 0,
        w: 100,
        h: 60,
        kind: NoteKind.Note,
        state: NoteState.User,
        body: '',
        createdAt: FIXED_TIME,
      },
    ]);
    await db.connections.bulkPut([
      {
        id: 'c1',
        spaceId: 's1',
        fromNoteId: 'n1',
        toNoteId: 'n2',
        createdAt: FIXED_TIME,
      },
      {
        id: 'c2',
        spaceId: 's1',
        fromNoteId: 'n3',
        toNoteId: 'n1',
        createdAt: FIXED_TIME,
      },
      {
        id: 'c3',
        spaceId: 's1',
        fromNoteId: 'n2',
        toNoteId: 'n3',
        createdAt: FIXED_TIME,
      },
    ]);

    await deleteNoteWithCascade('n1');

    expect(await db.notes.get('n1')).toBeUndefined();
    const remaining = await db.connections.toArray();
    expect(remaining.map((c) => c.id)).toEqual(['c3']);
  });
});
