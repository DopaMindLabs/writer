import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
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
  allowConfiguration: true,
  sections: [{ label: 'Notes', order: 0, defaultDocName: '' }],
  seedDocs: [
    {
      sectionLabel: 'Notes',
      subsectionLabel: '',
      name: 'Untitled',
      body: EMPTY_LEXICAL_JSON,
    },
  ],
  seedNotes: [],
  noteKinds: [NoteKind.Blank, NoteKind.Image],
};

export default template;
