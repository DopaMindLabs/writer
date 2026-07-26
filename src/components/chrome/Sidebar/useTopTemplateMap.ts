import { useMemo } from 'react';
import {
  getTemplate,
  type TemplateSection as TemplateSectionDef,
} from '@/data/templates';
import type { Space } from '@/db/schema';

export const useTopTemplateMap = (
  space: Space | undefined,
): Map<string, TemplateSectionDef> => {
  const templateDef = space ? getTemplate(space.template) : undefined;
  return useMemo(() => {
    const m = new Map<string, TemplateSectionDef>();
    for (const s of templateDef?.sections ?? []) m.set(s.label, s);
    return m;
  }, [templateDef]);
};
