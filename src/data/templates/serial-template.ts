import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'serial',
  label: 'Serial',
  tag: 'SE',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: 'recurring essays · newsletter',
  pickerOrder: 6,
  allowConfiguration: true,
  sections: [
    {
      label: 'Issues',
      order: 0,
      defaultDocName: 'Issue {{date}}',
    },
    { label: 'Recurring people', order: 1, defaultDocName: '' },
    { label: 'Calendar', order: 2, defaultDocName: '' },
  ],
  seedDocs: [
    {
      sectionLabel: 'Issues',
      subsectionLabel: '',
      name: 'Issue 01',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Recurring people',
      subsectionLabel: '',
      name: 'Cast',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Calendar',
      subsectionLabel: '',
      name: 'Schedule',
      body: EMPTY_LEXICAL_JSON,
    },
  ],
  seedNotes: [],
  noteKinds: [
    NoteKind.Note,
    NoteKind.Source,
    NoteKind.Todo,
    NoteKind.Blank,
    NoteKind.Image,
  ],
};

export default template;
