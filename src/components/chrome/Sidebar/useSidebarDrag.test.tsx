import { vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { DragEndEvent } from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
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
const evt = (activeId: string, overId: string | null): DragEndEvent =>
  ({
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent;

const setup = () => renderHook(() => useSidebarDrag(topSections, docsForSection));

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
});
