import { NoteKind, NoteLayout } from '@/db/schema';
import {
  getNoteType,
  listNoteTypes,
  resolveNoteLayout,
  getNoteLayoutConfig,
  NOTE_LAYOUT_CONFIG,
} from './index';

describe('note-types registry', () => {
  it('has a descriptor for every NoteKind', () => {
    for (const kind of Object.values(NoteKind)) {
      const descriptor = getNoteType(kind);
      expect(descriptor).toBeDefined();
      expect(descriptor.kind).toBe(kind);
      expect(descriptor.label).toBeTruthy();
      expect(descriptor.version).toBeTruthy();
    }
  });

  it('has a config for every NoteLayout', () => {
    for (const layout of Object.values(NoteLayout)) {
      expect(NOTE_LAYOUT_CONFIG[layout]).toBeDefined();
    }
  });

  it('lists every kind sorted by toolbarOrder then label', () => {
    const list = listNoteTypes();
    expect(list.length).toBe(Object.values(NoteKind).length);
    for (let i = 1; i < list.length; i += 1) {
      const ao = list[i - 1].toolbarOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = list[i].toolbarOrder ?? Number.MAX_SAFE_INTEGER;
      expect(ao).toBeLessThanOrEqual(bo);
    }
  });

  it('treats the image kind as an image-first layout with no body', () => {
    expect(getNoteType(NoteKind.Image).layout).toBe(NoteLayout.Image);
    const config = NOTE_LAYOUT_CONFIG[NoteLayout.Image];
    expect(config).toEqual({
      allowsText: false,
      allowsImages: true,
      imageFirst: true,
    });
  });

  it('treats text kinds as text-and-image with no image-first layout', () => {
    expect(getNoteType(NoteKind.Note).layout).toBe(NoteLayout.Text);
    expect(NOTE_LAYOUT_CONFIG[NoteLayout.Text]).toEqual({
      allowsText: true,
      allowsImages: true,
      imageFirst: false,
    });
  });

  it('treats the pdf-ref kind as a pdf-first layout with commentary text', () => {
    expect(getNoteType(NoteKind.PdfRef).layout).toBe(NoteLayout.PdfRef);
    expect(NOTE_LAYOUT_CONFIG[NoteLayout.PdfRef]).toEqual({
      allowsText: true,
      allowsImages: false,
      imageFirst: false,
      pdfRefFirst: true,
    });
  });
});

describe('resolveNoteLayout', () => {
  it('falls back to the kind default when no override is set', () => {
    expect(resolveNoteLayout({ kind: NoteKind.Note, layout: undefined })).toBe(
      NoteLayout.Text,
    );
    expect(resolveNoteLayout({ kind: NoteKind.Image, layout: undefined })).toBe(
      NoteLayout.Image,
    );
  });

  it('honours an explicit per-note layout override', () => {
    expect(
      resolveNoteLayout({ kind: NoteKind.Note, layout: NoteLayout.Image }),
    ).toBe(NoteLayout.Image);
  });
});

describe('getNoteLayoutConfig', () => {
  it('resolves capabilities from the effective layout', () => {
    expect(getNoteLayoutConfig({ kind: NoteKind.Image }).imageFirst).toBe(true);
    expect(getNoteLayoutConfig({ kind: NoteKind.Note }).allowsText).toBe(true);
  });
});
