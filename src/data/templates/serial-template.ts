import { NoteKind } from '@/db/schema';
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
  sections: [
    { label: 'Issues', order: 0, defaultDocName: 'Issue {{date}}' },
    { label: 'Recurring people', order: 1 },
    { label: 'Calendar', order: 2 },
  ],
  seedDocs: [
    { sectionLabel: 'Issues', name: 'Issue 01' },
    { sectionLabel: 'Recurring people', name: 'Cast' },
    { sectionLabel: 'Calendar', name: 'Schedule' },
  ],
  noteKinds: [
    NoteKind.Note,
    NoteKind.Source,
    NoteKind.Todo,
    NoteKind.Blank,
    NoteKind.Image,
  ],
};

export default template;
