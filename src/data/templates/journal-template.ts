import { NoteKind } from '@/db/schema';
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
  sections: [
    { label: 'Daily', order: 0, defaultDocName: '{{date}}' },
    { label: 'Themes', order: 1, defaultDocName: 'Theme' },
    { label: 'Seedlings', order: 2, defaultDocName: 'Seedling' },
    { label: 'Streak', order: 3 },
  ],
  seedDocs: [
    { sectionLabel: 'Daily', name: 'Today' },
    { sectionLabel: 'Themes', name: 'Recurring themes' },
    { sectionLabel: 'Seedlings', name: 'Ideas' },
    { sectionLabel: 'Streak', name: 'Tracker' },
  ],
  noteKinds: [NoteKind.Note, NoteKind.Question, NoteKind.Blank, NoteKind.Image],
};

export default template;
