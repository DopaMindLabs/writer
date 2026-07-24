import { describe, expect, it } from 'vitest';
import type { TemplateSection as TemplateSectionDef } from '@/data/templates';
import type { Doc, Section } from '@/db/schema';
import type { TranslateFn } from './Sidebar.types';
import {
  buildDocsForSection,
  formatSpaceAge,
  inferModeSuffix,
  resolveDefaultName,
} from './sidebarHelpers';

const section = (
  id: string,
  order: number,
  parentSectionId: string | null = null,
): Section => ({ id, spaceId: 's1', parentSectionId, label: id, order });

const doc = (id: string, sectionId: string): Doc => ({
  id,
  spaceId: 's1',
  sectionId,
  name: id,
  body: '',
  meta: { wordCount: 0 },
  updatedAt: 0,
});

const DAY = 86400000;
const echo: TranslateFn = (key, options) =>
  options ? `${key}#${String(options.count)}` : key;

describe('formatSpaceAge', () => {
  it('reads a same-day space as new', () => {
    expect(formatSpaceAge(Date.now(), echo)).toBe('chrome:sidebar.ageNew');
  });

  it('clamps a future timestamp to new rather than a negative age', () => {
    expect(formatSpaceAge(Date.now() + DAY * 10, echo)).toBe(
      'chrome:sidebar.ageNew',
    );
  });

  it('reads a span under a month in days', () => {
    expect(formatSpaceAge(Date.now() - DAY * 5, echo)).toBe(
      'chrome:sidebar.ageDays#5',
    );
  });

  it('reads a span under a year in whole months', () => {
    expect(formatSpaceAge(Date.now() - DAY * 65, echo)).toBe(
      'chrome:sidebar.ageMonths#2',
    );
  });

  it('reads a span over a year in whole years', () => {
    expect(formatSpaceAge(Date.now() - DAY * 400, echo)).toBe(
      'chrome:sidebar.ageYears#1',
    );
  });
});

describe('inferModeSuffix', () => {
  it('detects the read mode suffix', () => {
    expect(inferModeSuffix('/s/s1/d/d1/read')).toBe('/read');
  });

  it('detects the split mode suffix', () => {
    expect(inferModeSuffix('/s/s1/d/d1/split')).toBe('/split');
  });

  it('returns an empty suffix for the plain write path', () => {
    expect(inferModeSuffix('/s/s1/d/d1')).toBe('');
  });

  it('returns an empty suffix for an unrelated mode such as focus', () => {
    expect(inferModeSuffix('/s/s1/d/d1/focus')).toBe('');
  });
});

describe('buildDocsForSection', () => {
  it('flattens a section with its subsection documents in subsection order', () => {
    const topSections = [section('A', 0)];
    const subsectionsByParent = new Map<string, Section[]>([
      ['A', [section('A1', 0, 'A'), section('A2', 1, 'A')]],
    ]);
    const docsBySection = new Map<string, Doc[]>([
      ['A', [doc('dTop', 'A')]],
      ['A1', [doc('dSub1', 'A1')]],
      ['A2', [doc('dSub2', 'A2')]],
    ]);

    const result = buildDocsForSection(
      topSections,
      subsectionsByParent,
      docsBySection,
    );

    expect(result.get('A')?.map((d) => d.id)).toEqual([
      'dTop',
      'dSub1',
      'dSub2',
    ]);
  });

  it('maps a section with no documents or subsections to an empty list', () => {
    const result = buildDocsForSection(
      [section('Empty', 0)],
      new Map(),
      new Map(),
    );
    expect(result.get('Empty')).toEqual([]);
  });
});

describe('resolveDefaultName', () => {
  const map = new Map<string, TemplateSectionDef>([
    [
      'Chapters',
      {
        label: 'Chapters',
        order: 0,
        defaultDocName: 'Chapter',
        sections: [
          { label: 'Scenes', order: 0, defaultDocName: 'Scene' },
        ],
      },
    ],
    ['Notes', { label: 'Notes', order: 1, defaultDocName: '' }],
  ]);

  it('falls back to untitled when the parent label is unknown', () => {
    expect(resolveDefaultName(map, 'Ghost', null, 'Untitled')).toBe('Untitled');
  });

  it("uses the parent's default document name for a top-level add", () => {
    expect(resolveDefaultName(map, 'Chapters', null, 'Untitled')).toBe(
      'Chapter',
    );
  });

  it('falls back to untitled when the parent has no default name', () => {
    expect(resolveDefaultName(map, 'Notes', null, 'Untitled')).toBe('Untitled');
  });

  it("uses the subsection's default document name for a nested add", () => {
    expect(resolveDefaultName(map, 'Chapters', 'Scenes', 'Untitled')).toBe(
      'Scene',
    );
  });

  it('falls back to untitled when the subsection label is unknown', () => {
    expect(resolveDefaultName(map, 'Chapters', 'Missing', 'Untitled')).toBe(
      'Untitled',
    );
  });
});
