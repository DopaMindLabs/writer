import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { DragEndEvent, DragStartEvent } from '@/components/libs/dnd';
import type { Doc, Section } from '@/db/schema';
import { useDragAnnounce } from './useDragAnnounce';

const section = (id: string, label: string): Section => ({
  id,
  spaceId: 's1',
  parentSectionId: null,
  label,
  order: 0,
});
const doc = (id: string, sectionId: string, name: string): Doc => ({
  id,
  spaceId: 's1',
  sectionId,
  name,
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
});

const topSections = [section('sec1', 'Chapters'), section('sec2', 'Notes')];
const docsForSection = new Map<string, Doc[]>([
  ['sec1', [doc('dA', 'sec1', 'Intro')]],
  ['sec2', [doc('dC', 'sec2', 'Outline')]],
]);
const start = (id: string): DragStartEvent =>
  ({ active: { id } }) as unknown as DragStartEvent;
const end = (activeId: string, overId: string | null): DragEndEvent =>
  ({
    active: { id: activeId },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent;

const setup = () => renderHook(() => useDragAnnounce(topSections, docsForSection));

describe('useDragAnnounce', () => {
  it('starts empty', () => {
    expect(setup().result.current.announcement).toBe('');
  });

  it('announces the picked-up item by label', () => {
    const { result } = setup();
    act(() => { result.current.announceStart(start('dA')); });
    expect(result.current.announcement).toBe('Picked up Intro.');
  });

  it('announces a cross-section move with its destination', () => {
    const { result } = setup();
    act(() => { result.current.announceEnd(end('dA', 'dC')); });
    expect(result.current.announcement).toBe('Moved Intro to Notes.');
  });

  it('announces a section reorder', () => {
    const { result } = setup();
    act(() => { result.current.announceEnd(end('sec2', 'sec1')); });
    expect(result.current.announcement).toBe('Moved Notes.');
  });

  it('announces a plain drop when nothing changes', () => {
    const { result } = setup();
    act(() => { result.current.announceEnd(end('dA', null)); });
    expect(result.current.announcement).toBe('Dropped Intro.');
  });

  it('falls back to the id when the dragged item has no known label', () => {
    const { result } = setup();
    act(() => { result.current.announceStart(start('ghost')); });
    expect(result.current.announcement).toBe('Picked up ghost.');
  });
});
