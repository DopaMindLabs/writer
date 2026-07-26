import { formatDocName } from '@/lib/doc-naming';
import type { TemplateSection as TemplateSectionDef } from '@/data/templates';
import type { Doc, Section } from '@/db/schema';
import type { TranslateFn } from './Sidebar.types';

export const formatSpaceAge = (createdAt: number, t: TranslateFn): string => {
  const now = Date.now();
  const diffMs = Math.max(0, now - createdAt);
  const day = 86400000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return t('chrome:sidebar.ageNew');
  if (days < 30) return t('chrome:sidebar.ageDays', { count: days });
  if (days < 365)
    return t('chrome:sidebar.ageMonths', { count: Math.floor(days / 30) });
  return t('chrome:sidebar.ageYears', { count: Math.floor(days / 365) });
};

export const inferModeSuffix = (pathname: string): string => {
  if (pathname.endsWith('/read')) return '/read';
  if (pathname.endsWith('/split')) return '/split';
  return '';
};

/**
 * Flattens each top section's own documents together with those of its
 * subsections (in subsection order) into a single list, so the nav renders a
 * subsection's docs directly under its parent section with no header row.
 */
export const buildDocsForSection = (
  topSections: Section[],
  subsectionsByParent: Map<string, Section[]>,
  docsBySection: Map<string, Doc[]>,
): Map<string, Doc[]> => {
  const map = new Map<string, Doc[]>();
  for (const top of topSections) {
    const combined = [...(docsBySection.get(top.id) ?? [])];
    for (const sub of subsectionsByParent.get(top.id) ?? []) {
      combined.push(...(docsBySection.get(sub.id) ?? []));
    }
    map.set(top.id, combined);
  }
  return map;
};

export const resolveDefaultName = (
  topTemplateDefByLabel: Map<string, TemplateSectionDef>,
  parentLabel: string,
  subLabel: string | null,
  untitled: string,
): string => {
  const parentDef = topTemplateDefByLabel.get(parentLabel);
  if (!parentDef) return untitled;
  if (subLabel === null) {
    return parentDef.defaultDocName
      ? formatDocName(parentDef.defaultDocName)
      : untitled;
  }
  const subDef = (parentDef.sections ?? []).find((s) => s.label === subLabel);
  return subDef?.defaultDocName
    ? formatDocName(subDef.defaultDocName)
    : untitled;
};
