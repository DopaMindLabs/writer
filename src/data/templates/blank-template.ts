import { NoteKind } from '@/db/schema';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'blank',
  label: 'Blank',
  tag: 'BL',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: true,
  description: 'start from nothing',
  pickerOrder: 8,
  sections: [{ label: 'Notes', order: 0 }],
  seedDocs: [{ sectionLabel: 'Notes', name: 'Untitled' }],
  noteKinds: [NoteKind.Blank, NoteKind.Image],
};

export default template;
