import type { Template } from './types';

const modules = import.meta.glob<{ default: Template }>('./*-template.ts', {
  eager: true,
});

const REGISTRY: Record<string, Template> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.id, m.default]),
);

export function listTemplates(): Template[] {
  return Object.values(REGISTRY).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export function getTemplate(id: string): Template | undefined {
  return REGISTRY[id];
}

export type { Template, TemplateSection, TemplateSeedDoc } from './types';
