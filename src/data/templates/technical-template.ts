import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'technical',
  label: 'Technical · Scientific report',
  tag: 'TX',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: 'Scientific · methods · equations',
  pickerOrder: 2,
  allowConfiguration: true,
  seedNotes: [],
  sections: [
    { label: 'Report', order: 0, defaultDocName: '' },
    { label: 'Data & figures', order: 1, defaultDocName: '' },
    { label: 'Code & math', order: 2, defaultDocName: '' },
    { label: 'Workshop', order: 3, defaultDocName: '' },
  ],
  seedDocs: [
    { sectionLabel: 'Report', subsectionLabel: '', name: 'Scientific report', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Report', subsectionLabel: '', name: 'Abstract', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Report', subsectionLabel: '', name: 'Methods', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Report', subsectionLabel: '', name: 'Results & figs', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Data & figures', subsectionLabel: '', name: 'Datasets', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Data & figures', subsectionLabel: '', name: 'Figures', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Data & figures', subsectionLabel: '', name: 'Tables', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Data & figures', subsectionLabel: '', name: 'Notebooks', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Code & math', subsectionLabel: '', name: 'Snippets', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Code & math', subsectionLabel: '', name: 'Equations', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Code & math', subsectionLabel: '', name: 'References', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Workshop', subsectionLabel: '', name: 'Sessions', body: EMPTY_LEXICAL_JSON },
  ],
  noteKinds: [
    NoteKind.Question,
    NoteKind.Source,
    NoteKind.Claim,
    NoteKind.Figure,
    NoteKind.Todo,
    NoteKind.LooseEnd,
    NoteKind.Image,
  ],
};

export default template;
