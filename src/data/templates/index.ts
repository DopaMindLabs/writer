import type { Template } from './types';

const modules = import.meta.glob<{ default: Template }>('./*-template.ts', {
  eager: true,
});

const REGISTRY: Record<string, Template> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.id, m.default]),
);

const compareForPicker = (a: Template, b: Template): number => {
  const ao = a.pickerOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = b.pickerOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return a.label.localeCompare(b.label);
};

export const listTemplates = (): Template[] => {
  return Object.values(REGISTRY)
    .filter((t) => t.enabled)
    .sort(compareForPicker);
};

export const getTemplate = (id: string): Template | undefined => {
  return REGISTRY[id];
};

export type {
  Template,
  TemplateSection,
  TemplateSeedDoc,
  TemplateStage,
} from './types';
