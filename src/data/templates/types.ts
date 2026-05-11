export interface TemplateSection {
  label: string;
  order: number;
}

export interface TemplateSeedDoc {
  sectionLabel: string;
  name: string;
  body?: string;
}

export interface Template {
  id: string;
  label: string;
  tag: string;
  description?: string;
  sections: TemplateSection[];
  seedDocs: TemplateSeedDoc[];
}
