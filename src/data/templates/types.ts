export interface TemplateSection {
  label: string;
  order: number;
  sections?: TemplateSection[];
  /**
   * Default name for new docs added in this section via the Sidebar `+` button.
   * Supports placeholders resolved at creation time:
   *   {{date}}     → ISO date (e.g. 2026-05-12)
   *   {{datetime}} → ISO date + HH:mm
   *   {{day}}      → weekday (e.g. Tuesday)
   * If omitted, defaults to "Untitled".
   */
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
  kind: 'note' | 'char' | 'place' | 'lore';
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
}
