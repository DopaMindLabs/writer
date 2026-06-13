import type { NoteKind } from '@/db/schema';

export interface TemplateSection {
  label: string;
  order: number;
  sections?: TemplateSection[];
  defaultDocName?: string;
}

export interface TemplateSeedDoc {
  sectionLabel: string;
  subsectionLabel?: string;
  name: string;
  body?: string;
}

export interface TemplateSeedNote {
  l: number;
  t: number;
  w: number;
  h: number;
  kind: NoteKind;
  title?: string;
  body: string;
}

export enum TemplateStage {
  Experimental = 'experimental',
  PreAlpha = 'pre-alpha',
  Alpha = 'alpha',
  Beta = 'beta',
  Stable = 'stable',
}

export interface Template {
  id: string;
  label: string;
  tag: string;
  version: string;
  stage?: TemplateStage;
  enabled: boolean;
  description?: string;
  pickerOrder?: number;
  sections: TemplateSection[];
  seedDocs: TemplateSeedDoc[];
  seedNotes?: TemplateSeedNote[];
  noteKinds: NoteKind[];
  allowExtraSections?: boolean;
}
