import type { Doc, Section } from '@/db/schema';
import { applyDrop, buildOrder, type SidebarOrder } from './sidebarOrder';

const section = (id: string): Section => ({
  id,
  spaceId: 's1',
  parentSectionId: null,
  label: id,
  order: 0,
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

const base: SidebarOrder = {
  sectionIds: ['sec1', 'sec2'],
  docIds: { sec1: ['dA', 'dB'], sec2: ['dC'] },
};

describe('buildOrder', () => {
  it('captures section order and each section’s document ids', () => {
    const order = buildOrder(
      [section('sec1'), section('sec2')],
      new Map([
        ['sec1', [doc('dA', 'sec1'), doc('dB', 'sec1')]],
        ['sec2', [doc('dC', 'sec2')]],
      ]),
    );
    expect(order).toEqual(base);
  });
});

describe('applyDrop', () => {
  it('reorders sections', () => {
    expect(
      applyDrop(base, { kind: 'section', sectionId: 'sec2', toIndex: 0 }).sectionIds,
    ).toEqual(['sec2', 'sec1']);
  });

  it('reorders a document within its section', () => {
    expect(
      applyDrop(base, {
        kind: 'doc',
        docId: 'dB',
        toSectionId: 'sec1',
        toIndex: 0,
      }).docIds,
    ).toEqual({ sec1: ['dB', 'dA'], sec2: ['dC'] });
  });

  it('moves a document across sections at the target index', () => {
    expect(
      applyDrop(base, {
        kind: 'doc',
        docId: 'dA',
        toSectionId: 'sec2',
        toIndex: 0,
      }).docIds,
    ).toEqual({ sec1: ['dB'], sec2: ['dA', 'dC'] });
  });

  it('appends a document dropped at a section’s end', () => {
    expect(
      applyDrop(base, {
        kind: 'doc',
        docId: 'dA',
        toSectionId: 'sec2',
        toIndex: 1,
      }).docIds,
    ).toEqual({ sec1: ['dB'], sec2: ['dC', 'dA'] });
  });

  it('leaves the order unchanged when the item is not found', () => {
    expect(applyDrop(base, { kind: 'section', sectionId: 'ghost', toIndex: 0 })).toBe(
      base,
    );
  });
});
