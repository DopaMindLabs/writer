import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { DragEndEvent } from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { useSidebarDrag } from './useSidebarDrag';

const { moveDocMock, reorderSectionMock } = vi.hoisted(() => ({
  moveDocMock: vi.fn(),
  reorderSectionMock: vi.fn(),
}));
vi.mock('@/lib/docs', async (orig) => ({
  ...(await orig<typeof import('@/lib/docs')>()),
  moveDoc: moveDocMock,
}));
vi.mock('@/lib/sections', async (orig) => ({
  ...(await orig<typeof import('@/lib/sections')>()),
  reorderSection: reorderSectionMock,
}));

const section = (id: string, order: number): Section => ({
  ...sampleMetadata(),
  id,
  spaceId: 's1',
  parentSectionId: null,
  label: id,
  order,
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

const topSections = [section('sec1', 0), section('sec2', 1)];
const docsForSection = new Map<string, Doc[]>([
  ['sec1', [doc('dA', 'sec1'), doc('dB', 'sec1')]],
  ['sec2', [doc('dC', 'sec2')]],
]);
const evt = (activeId: string, overId: string | null): DragEndEvent =>
  ({
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent;

const setup = () => renderHook(() => useSidebarDrag(topSections, docsForSection));

/** Harness whose live inputs can be swapped, as the live query would on emit. */
const setupLive = () =>
  renderHook(
    ({ sections, docs }: { sections: Section[]; docs: Map<string, Doc[]> }) =>
      useSidebarDrag(sections, docs),
    { initialProps: { sections: topSections, docs: docsForSection } },
  );

describe('useSidebarDrag', () => {
  beforeEach(() => {
    moveDocMock.mockReset().mockResolvedValue(undefined);
    reorderSectionMock.mockReset().mockResolvedValue(undefined);
  });

  it('exposes sections and their documents in order', () => {
    const { result } = setup();
    expect(result.current.sectionIds).toEqual(['sec1', 'sec2']);
    expect(result.current.orderedSections.map((s) => s.section.id)).toEqual([
      'sec1',
      'sec2',
    ]);
    expect(result.current.orderedSections[0].docs.map((d) => d.id)).toEqual([
      'dA',
      'dB',
    ]);
  });

  it('reorders a section optimistically and persists it', () => {
    const { result } = setup();
    act(() => { result.current.onDragEnd(evt('sec2', 'sec1')); });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);
    expect(reorderSectionMock).toHaveBeenCalledWith('sec2', 0);
  });

  it('moves a document across sections optimistically and persists it', () => {
    const { result } = setup();
    act(() => { result.current.onDragEnd(evt('dA', 'dC')); });
    const sec2 = result.current.orderedSections.find(
      (s) => s.section.id === 'sec2',
    );
    expect(sec2?.docs.map((d) => d.id)).toEqual(['dA', 'dC']);
    expect(moveDocMock).toHaveBeenCalledWith({
      docId: 'dA',
      toSectionId: 'sec2',
      toIndex: 0,
    });
  });

  it('does nothing when dropped on empty space', () => {
    const { result } = setup();
    act(() => { result.current.onDragEnd(evt('dA', null)); });
    expect(moveDocMock).not.toHaveBeenCalled();
    expect(reorderSectionMock).not.toHaveBeenCalled();
    expect(result.current.orderedSections[0].docs.map((d) => d.id)).toEqual([
      'dA',
      'dB',
    ]);
  });

  it('keeps the order while a drag is in progress', () => {
    const { result } = setup();
    act(() => { result.current.onDragStart(); });
    expect(result.current.sectionIds).toEqual(['sec1', 'sec2']);
  });

  it('resumes reconciling live data after a cancelled drag', () => {
    const { result, rerender } = setupLive();
    act(() => { result.current.onDragStart(); });
    act(() => { result.current.onDragCancel(); });
    // The live query emits a new order (e.g. another tab moved sec2 first).
    rerender({
      sections: [section('sec2', 0), section('sec1', 1)],
      docs: docsForSection,
    });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);
    expect(moveDocMock).not.toHaveBeenCalled();
    expect(reorderSectionMock).not.toHaveBeenCalled();
  });

  it('keeps the optimistic order until the live query reflects the drop', () => {
    const { result, rerender } = setupLive();
    act(() => { result.current.onDragStart(); });
    act(() => { result.current.onDragEnd(evt('sec2', 'sec1')); });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);

    // A rerender with the SAME still-stale inputs (persistence not yet
    // reflected) must not snap the order back.
    rerender({ sections: topSections, docs: docsForSection });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);

    // Fresh live data (new identities, persisted order) reconciles it.
    rerender({
      sections: [section('sec2', 0), section('sec1', 1)],
      docs: new Map(docsForSection),
    });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);
  });

  it('holds through an unrelated emission while the write is still in flight', () => {
    const { result, rerender } = setupLive();
    act(() => { result.current.onDragStart(); });
    act(() => { result.current.onDragEnd(evt('sec2', 'sec1')); });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);

    // An unrelated update (e.g. a rename in another tab) emits NEW instances
    // whose order is still the stale one. New identity alone must not release
    // the hold — that would rebuild from stale data and snap the order back.
    rerender({
      sections: [section('sec1', 0), section('sec2', 1)],
      docs: new Map(docsForSection),
    });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);

    // The emission that reflects the drop settles it.
    rerender({
      sections: [section('sec2', 0), section('sec1', 1)],
      docs: new Map(docsForSection),
    });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);
  });

  it('accepts a non-matching emission once the write has committed', async () => {
    const { result, rerender } = setupLive();
    act(() => { result.current.onDragStart(); });
    act(() => { result.current.onDragEnd(evt('sec2', 'sec1')); });
    // Flush the resolved persistence promise: the write has committed.
    await act(async () => { await Promise.resolve(); });

    // A concurrent writer produced an order that never matches the expected
    // one; after commit the live data is authoritative and must win.
    rerender({
      sections: [section('sec1', 0), section('sec2', 1)],
      docs: new Map(docsForSection),
    });
    expect(result.current.sectionIds).toEqual(['sec1', 'sec2']);
  });

  it('rolls the order back when persisting the drop fails', async () => {
    reorderSectionMock.mockRejectedValue(new Error('offline'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { result } = setupLive();
    act(() => { result.current.onDragStart(); });
    act(() => { result.current.onDragEnd(evt('sec2', 'sec1')); });
    expect(result.current.sectionIds).toEqual(['sec2', 'sec1']);

    // Flush the rejected persistence promise; the hold is released and the
    // (unchanged) live inputs rebuild the original order.
    await act(async () => { await Promise.resolve(); });
    expect(result.current.sectionIds).toEqual(['sec1', 'sec2']);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
