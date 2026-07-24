import { useMemo } from 'react';
import type { Doc, Section } from '@/db/schema';
import { buildDocsForSection } from './sidebarHelpers';

export const useSidebarSections = (sections: Section[], docs: Doc[]) => {
  const { topSections, subsectionsByParent } = useMemo(() => {
    const top: Section[] = [];
    const subs = new Map<string, Section[]>();
    for (const s of sections) {
      if (s.parentSectionId === null) {
        top.push(s);
      } else {
        const arr = subs.get(s.parentSectionId) ?? [];
        arr.push(s);
        subs.set(s.parentSectionId, arr);
      }
    }
    top.sort((a, b) => a.order - b.order);
    for (const arr of subs.values()) arr.sort((a, b) => a.order - b.order);
    return { topSections: top, subsectionsByParent: subs };
  }, [sections]);

  const docsBySection = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of docs) {
      const arr = map.get(d.sectionId) ?? [];
      arr.push(d);
      map.set(d.sectionId, arr);
    }
    return map;
  }, [docs]);

  const docsForSection = useMemo(
    () => buildDocsForSection(topSections, subsectionsByParent, docsBySection),
    [topSections, subsectionsByParent, docsBySection],
  );

  return { topSections, docsForSection };
};
