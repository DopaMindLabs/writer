import { db } from './db';
import {
  createSpaceFromTemplate,
  deleteNoteWithCascade,
  seedIfEmpty,
} from './seed';
import { NoteKind, NoteState } from './schema';
import { TemplateStage, type Template } from '@/data/templates';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { FIXED_TIME, sampleMetadata, serializedBody } from '@/test/fixtures';
import { isParseableBody } from '@/lib/revisions';

const DOC_B_BODY = serializedBody('b');

const TEST_TEMPLATE: Template = {
  id: 'test-tpl',
  label: 'Test Template',
  tag: 'tst',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: '',
  pickerOrder: 0,
  allowConfiguration: true,
  sections: [
    {
      label: 'Drafts',
      order: 0,
      defaultDocName: '',
      sections: [{ label: 'Ideas', order: 0, defaultDocName: '' }],
    },
    { label: 'Final', order: 1, defaultDocName: '' },
  ],
  seedDocs: [
    {
      sectionLabel: 'Drafts',
      subsectionLabel: '',
      name: 'Doc A',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Drafts',
      subsectionLabel: 'Ideas',
      name: 'Doc B',
      body: DOC_B_BODY,
    },
    {
      sectionLabel: 'Final',
      subsectionLabel: '',
      name: 'Doc C',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Nonexistent',
      subsectionLabel: '',
      name: 'Skipped',
      body: EMPTY_LEXICAL_JSON,
    },
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
    expect(sections).toHaveLength(3);
    const drafts = sections.find((s) => s.label === 'Drafts');
    const ideas = sections.find((s) => s.label === 'Ideas');
    expect(ideas?.parentSectionId).toBe(drafts?.id);

    const docs = await db.docs.where('spaceId').equals(id).toArray();
    expect(docs).toHaveLength(3);
    expect(docs.some((d) => d.body === DOC_B_BODY)).toBe(true);

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

  it('gives every seeded doc a valid Lexical body', async () => {
    await seedIfEmpty();
    const docs = await db.docs.toArray();
    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(isParseableBody(doc.body)).toBe(true);
    }
  });
});

describe('deleteNoteWithCascade', () => {
  it('removes connections referencing the deleted note from either end', async () => {
    await db.notes.bulkPut([
      {
        ...sampleMetadata(),
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
        ...sampleMetadata(),
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
        ...sampleMetadata(),
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
        ...sampleMetadata(),
        id: 'c1',
        spaceId: 's1',
        fromNoteId: 'n1',
        toNoteId: 'n2',
        createdAt: FIXED_TIME,
      },
      {
        ...sampleMetadata(),
        id: 'c2',
        spaceId: 's1',
        fromNoteId: 'n3',
        toNoteId: 'n1',
        createdAt: FIXED_TIME,
      },
      {
        ...sampleMetadata(),
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

  it('removes image attachments belonging to the deleted note', async () => {
    await db.notes.bulkPut([
      {
        ...sampleMetadata(),
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
        ...sampleMetadata(),
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
    ]);
    await db.noteAttachments.bulkPut([
      {
        ...sampleMetadata(),
        id: 'att-n1',
        noteId: 'n1',
        spaceId: 's1',
        name: 'a.png',
        mime: 'image/png',
        size: 1,
        blob: new Blob(['x']),
        createdAt: FIXED_TIME,
      },
      {
        ...sampleMetadata(),
        id: 'att-n2',
        noteId: 'n2',
        spaceId: 's1',
        name: 'b.png',
        mime: 'image/png',
        size: 1,
        blob: new Blob(['y']),
        createdAt: FIXED_TIME,
      },
    ]);

    await deleteNoteWithCascade('n1');

    expect(await db.noteAttachments.get('att-n1')).toBeUndefined();
    expect(await db.noteAttachments.get('att-n2')).toBeDefined();
  });
});
