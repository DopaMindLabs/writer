import type { Doc, Section } from '@/db/schema';
import { resolveSidebarDrop } from './resolveSidebarDrop';

const section = (id: string, order: number): Section => ({
  id,
  spaceId: 's1',
  parentSectionId: null,
  label: id,
  order,
});

const doc = (id: string, sectionId: string): Doc => ({
  id,
  spaceId: 's1',
  sectionId,
  name: id,
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
});

const topSections = [section('sec1', 0), section('sec2', 1)];
const docsForSection = new Map<string, Doc[]>([
  ['sec1', [doc('dA', 'sec1'), doc('dB', 'sec1')]],
  ['sec2', [doc('dC', 'sec2')]],
]);

const resolve = (activeId: string, overId: string) =>
  resolveSidebarDrop({ topSections, docsForSection, activeId, overId });

describe('resolveSidebarDrop', () => {
  it('reorders a section onto another section', () => {
    expect(resolve('sec2', 'sec1')).toEqual({
      kind: 'section',
      sectionId: 'sec2',
      toIndex: 0,
    });
  });

  it('reorders a section when dropped over a document (uses that doc’s section)', () => {
    expect(resolve('sec1', 'dC')).toEqual({
      kind: 'section',
      sectionId: 'sec1',
      toIndex: 1,
    });
  });

  it('moves a document within its section onto another document', () => {
    expect(resolve('dB', 'dA')).toEqual({
      kind: 'doc',
      docId: 'dB',
      toSectionId: 'sec1',
      toIndex: 0,
    });
  });

  it('moves a document across sections onto a document in another section', () => {
    expect(resolve('dA', 'dC')).toEqual({
      kind: 'doc',
      docId: 'dA',
      toSectionId: 'sec2',
      toIndex: 0,
    });
  });

  it('moves a document onto a section container, appending to its end', () => {
    expect(resolve('dA', 'sec2')).toEqual({
      kind: 'doc',
      docId: 'dA',
      toSectionId: 'sec2',
      toIndex: 1,
    });
  });

  it('returns null when dropped on itself', () => {
    expect(resolve('sec1', 'sec1')).toBeNull();
    expect(resolve('dA', 'dA')).toBeNull();
  });

  it('returns null for an unknown over target', () => {
    expect(resolve('dA', 'nope')).toBeNull();
  });
});
