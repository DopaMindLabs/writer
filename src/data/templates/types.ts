import type { NoteKind } from '@/db/schema';

export interface TemplateSection {
  label: string;
  order: number;
  /** Nested subsections; omitted when the section has none. */
  sections?: TemplateSection[];
  /** Name given to a new document added here; empty for no specific default. */
  defaultDocName: string;
}

export interface TemplateSeedDoc {
  sectionLabel: string;
  /** Owning subsection; empty when the document sits at section level. */
  subsectionLabel: string;
  name: string;
  /** Serialized Lexical body; empty for a blank document. */
  body: string;
}

export interface TemplateSeedNote {
  l: number;
  t: number;
  w: number;
  h: number;
  kind: NoteKind;
  /** Note title; empty for an untitled note. */
  title: string;
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
  stage: TemplateStage;
  enabled: boolean;
  description: string;
  pickerOrder: number;
  sections: TemplateSection[];
  seedDocs: TemplateSeedDoc[];
  seedNotes: TemplateSeedNote[];
  noteKinds: NoteKind[];
  /**
   * Whether the user may manage this space's section structure (add, rename,
   * delete, reorder) and move documents between sections. Set false to lock the
   * seeded shape.
   *
   * TODO: this is a single coarse switch. It may need to split into granular
   * permissions (e.g. allowRename, allowMove, allowDelete, allowReorder) so a
   * template can lock some structural actions while permitting others. Keep the
   * one flag for now; revisit when a template needs finer control.
   */
  allowConfiguration: boolean;
}
