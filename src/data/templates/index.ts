import type { Template } from './types';

const modules = import.meta.glob<{ default: Template }>('./*-template.ts', {
  eager: true,
});

const REGISTRY: Record<string, Template> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.id, m.default]),
);

const compareForPicker = (a: Template, b: Template): number => {
  if (a.pickerOrder !== b.pickerOrder) return a.pickerOrder - b.pickerOrder;
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

export { TemplateStage } from './types';
export type { Template, TemplateSection, TemplateSeedDoc } from './types';
