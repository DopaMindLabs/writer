import { describe, expect, it } from 'vitest';
import { NoteKind, NoteState } from '@/db/schema';
import {
  sampleAnnotation,
  sampleAttachment,
  sampleCitation,
  sampleDoc,
  sampleInspectorConfig,
  sampleNote,
  samplePalette,
  sampleRevision,
  sampleSection,
  sampleSpace,
} from '@/test/fixtures';
import {
  parseAnnotationRecord,
  parseCitationRecord,
  parseConnectionRecord,
  parseDocInspectorConfigRecord,
  parseDocRecord,
  parseNoteAttachmentRecord,
  parseNoteRecord,
  parsePaletteRecord,
  parseRevisionRecord,
  parseSectionRecord,
  parseSpaceRecord,
  serializeNoteAttachment,
} from './codecs';

const viaJson = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value)) as unknown;

describe('record codecs', () => {
  it('round-trips a space record', () => {
    expect(parseSpaceRecord(viaJson(sampleSpace))).toEqual(sampleSpace);
  });

  it('round-trips a section record, keeping null parents', () => {
    expect(parseSectionRecord(viaJson(sampleSection))).toEqual(sampleSection);
    const child = { ...sampleSection, id: 'sec2', parentSectionId: 'sec1' };
    expect(parseSectionRecord(viaJson(child))).toEqual(child);
  });

  it('round-trips a doc record with full meta', () => {
    const doc = {
      ...sampleDoc,
      body: '{"root":{}}',
      meta: {
        wordCount: 7,
        status: 'draft',
        wordLimit: 500,
        charLimit: 2000,
        dueDate: 1704067200000,
      },
    };
    expect(parseDocRecord(viaJson(doc))).toEqual(doc);
  });

  it('round-trips note records with and without optional fields', () => {
    expect(parseNoteRecord(viaJson(sampleNote))).toEqual(sampleNote);
    const full = {
      ...sampleNote,
      id: 'n9',
      kind: NoteKind.Image,
      state: NoteState.SeedFetched,
      title: 'T',
      linkedDocId: 'd1',
      layout: 'image',
      typeVersion: '1',
    };
    expect(parseNoteRecord(viaJson(full))).toEqual(full);
  });

  it('round-trips attachment records via serializeNoteAttachment', () => {
    const record = serializeNoteAttachment(
      sampleAttachment,
      'assets/notes/n1/sketch.png',
    );
    expect(parseNoteAttachmentRecord(viaJson(record))).toEqual(record);
    expect(record).not.toHaveProperty('blob');
  });

  it('round-trips annotation, citation, connection, revision records', () => {
    expect(parseAnnotationRecord(viaJson(sampleAnnotation))).toEqual(
      sampleAnnotation,
    );
    expect(parseCitationRecord(viaJson(sampleCitation))).toEqual(sampleCitation);
    const connection = {
      id: 'c1',
      spaceId: 's1',
      fromNoteId: 'n1',
      toNoteId: 'n2',
      createdAt: 1,
    };
    expect(parseConnectionRecord(viaJson(connection))).toEqual(connection);
    const revision = {
      ...sampleRevision,
      label: 'milestone',
      pinned: true,
      meta: { source: 'unit-test' },
    };
    expect(parseRevisionRecord(viaJson(revision))).toEqual(revision);
  });

  it('round-trips palette and doc-inspector config records', () => {
    expect(parsePaletteRecord(viaJson(samplePalette))).toEqual(samplePalette);
    expect(parseDocInspectorConfigRecord(viaJson(sampleInspectorConfig))).toEqual(
      sampleInspectorConfig,
    );
  });

  it('drops unknown extra fields instead of carrying them through', () => {
    const parsed = parseSpaceRecord({ ...viaJson(sampleSpace) as object, evil: 1 });
    expect(parsed).not.toHaveProperty('evil');
  });

  it('rejects non-object records', () => {
    expect(() => parseSpaceRecord(null)).toThrow(/expected an object/);
    expect(() => parseDocRecord([])).toThrow(/expected an object/);
    expect(() => parseNoteRecord('x')).toThrow(/expected an object/);
  });

  it('rejects wrong field types with the field name in the message', () => {
    expect(() => parseSpaceRecord({ ...viaJson(sampleSpace) as object, name: 5 }))
      .toThrow(/space\.name/);
    expect(() =>
      parseDocRecord({ ...viaJson(sampleDoc) as object, body: undefined }),
    ).toThrow(/doc\.body/);
    expect(() =>
      parseSectionRecord({ ...viaJson(sampleSection) as object, parentSectionId: 7 }),
    ).toThrow(/parentSectionId/);
    expect(() =>
      parseRevisionRecord({ ...viaJson(sampleRevision) as object, wordCount: 'two' }),
    ).toThrow(/revision\.wordCount/);
  });

  it('rejects values outside known enums', () => {
    expect(() =>
      parseNoteRecord({ ...viaJson(sampleNote) as object, kind: 'alien' }),
    ).toThrow(/note\.kind/);
    expect(() =>
      parseAnnotationRecord({ ...viaJson(sampleAnnotation) as object, color: 'mauve' }),
    ).toThrow(/annotation\.color/);
    expect(() =>
      parseCitationRecord({ ...viaJson(sampleCitation) as object, type: 'zine' }),
    ).toThrow(/citation\.type/);
    expect(() =>
      parseDocInspectorConfigRecord({
        ...viaJson(sampleInspectorConfig) as object,
        wordLimit: 'maybe',
      }),
    ).toThrow(/wordLimit/);
    expect(() =>
      parseDocInspectorConfigRecord({
        ...viaJson(sampleInspectorConfig) as object,
        statusStages: { imaginary: true },
      }),
    ).toThrow(/unknown stage/);
  });

  it('rejects malformed palette slots and revision meta', () => {
    expect(() =>
      parsePaletteRecord({ ...viaJson(samplePalette) as object, slots: 'none' }),
    ).toThrow(/palette\.slots/);
    expect(() =>
      parseRevisionRecord({ ...viaJson(sampleRevision) as object, meta: 3 }),
    ).toThrow(/revision\.meta/);
  });
});
