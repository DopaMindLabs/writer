import type { Doc, Section } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import {
  applyDrop,
  buildOrder,
  ordersEqual,
  type SidebarOrder,
} from './sidebarOrder';

const section = (id: string): Section => ({
  ...sampleMetadata(),
  id,
  spaceId: 's1',
  parentSectionId: null,
  label: id,
  order: 0,
});

const doc = (id: string, sectionId: string): Doc => ({
  ...sampleMetadata(),
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

describe('ordersEqual', () => {
  const base: SidebarOrder = {
    sectionIds: ['a', 'b'],
    docIds: { a: ['d1', 'd2'], b: ['d3'] },
  };

  it('matches an order with identical placement', () => {
    expect(
      ordersEqual(base, {
        sectionIds: ['a', 'b'],
        docIds: { a: ['d1', 'd2'], b: ['d3'] },
      }),
    ).toBe(true);
  });

  it('rejects a different section order', () => {
    expect(
      ordersEqual(base, {
        sectionIds: ['b', 'a'],
        docIds: { a: ['d1', 'd2'], b: ['d3'] },
      }),
    ).toBe(false);
  });

  it('rejects a document moved between sections', () => {
    expect(
      ordersEqual(base, {
        sectionIds: ['a', 'b'],
        docIds: { a: ['d2'], b: ['d3', 'd1'] },
      }),
    ).toBe(false);
  });

  it('rejects a document reordered within its section', () => {
    expect(
      ordersEqual(base, {
        sectionIds: ['a', 'b'],
        docIds: { a: ['d2', 'd1'], b: ['d3'] },
      }),
    ).toBe(false);
  });

  it('treats a missing doc list as empty', () => {
    expect(
      ordersEqual(
        { sectionIds: ['a'], docIds: {} },
        { sectionIds: ['a'], docIds: { a: [] } },
      ),
    ).toBe(true);
  });
});
