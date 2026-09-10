import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Doc, Section } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { useSidebarSections } from './useSidebarSections';

const section = (
  id: string,
  order: number,
  parentSectionId: string | null = null,
): Section => ({
  ...sampleMetadata(),
  id,
  spaceId: 's1',
  parentSectionId,
  label: id,
  order,
});

const doc = (id: string, sectionId: string, order?: number): Doc => ({
  ...sampleMetadata(),
  id,
  spaceId: 's1',
  sectionId,
  name: id,
  body: '',
  meta: { wordCount: 0 },
  order,
  updatedAt: 0,
});

describe('useSidebarSections', () => {
  it('exposes only top-level sections, ordered by their order field', () => {
    const sections = [
      section('B', 1),
      section('A', 0),
      section('A1', 0, 'A'),
    ];
    const { result } = renderHook(() => useSidebarSections(sections, []));
    expect(result.current.topSections.map((s) => s.id)).toEqual(['A', 'B']);
  });

  it("flattens each top section's documents with its subsection's, ordered by order", () => {
    const sections = [section('A', 0), section('A1', 0, 'A'), section('B', 1)];
    const docs = [
      doc('dA2', 'A', 1),
      doc('dA1', 'A', 0),
      doc('dSub', 'A1', 0),
      doc('dB1', 'B'),
      doc('dB2', 'B', 0),
    ];
    const { result } = renderHook(() => useSidebarSections(sections, docs));

    expect(result.current.docsForSection.get('A')?.map((d) => d.id)).toEqual([
      'dA1',
      'dA2',
      'dSub',
    ]);
    // A doc without an order sorts after ordered docs in the same section.
    expect(result.current.docsForSection.get('B')?.map((d) => d.id)).toEqual([
      'dB2',
      'dB1',
    ]);
  });
});
