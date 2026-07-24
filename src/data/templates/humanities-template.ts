import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'humanities',
  label: 'Thesis · research',
  tag: 'TH',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: 'long-form academic',
  pickerOrder: 3,
  allowConfiguration: true,
  sections: [
    { label: 'Manuscript', order: 0, defaultDocName: '' },
    { label: 'Sources', order: 1, defaultDocName: '' },
    { label: 'Arguments', order: 2, defaultDocName: '' },
    { label: 'Workshop', order: 3, defaultDocName: '' },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: 'Introduction', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: 'Chapter 01', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: 'Outline', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Sources', subsectionLabel: '', name: 'Primary sources', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Sources', subsectionLabel: '', name: 'Secondary sources', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Arguments', subsectionLabel: '', name: 'Thesis', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Arguments', subsectionLabel: '', name: 'Counter-arguments', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Arguments', subsectionLabel: '', name: 'Open questions', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Workshop', subsectionLabel: '', name: 'Sessions', body: EMPTY_LEXICAL_JSON },
  ],
  seedNotes: [],
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
