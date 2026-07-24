import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'journal',
  label: 'Journal',
  tag: 'JO',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: 'daily, low-stakes',
  pickerOrder: 7,
  allowConfiguration: true,
  sections: [
    { label: 'Daily', order: 0, defaultDocName: '{{date}}' },
    { label: 'Themes', order: 1, defaultDocName: 'Theme' },
    { label: 'Seedlings', order: 2, defaultDocName: 'Seedling' },
    { label: 'Streak', order: 3, defaultDocName: '' },
  ],
  seedDocs: [
    { sectionLabel: 'Daily', subsectionLabel: '', name: 'Today', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Themes', subsectionLabel: '', name: 'Recurring themes', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Seedlings', subsectionLabel: '', name: 'Ideas', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Streak', subsectionLabel: '', name: 'Tracker', body: EMPTY_LEXICAL_JSON },
  ],
  seedNotes: [],
  noteKinds: [NoteKind.Note, NoteKind.Question, NoteKind.Blank, NoteKind.Image],
};

export default template;
