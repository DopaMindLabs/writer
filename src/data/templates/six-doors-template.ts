import { NoteKind } from '@/db/schema';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'six',
  label: 'Six Doors · collaborative',
  tag: 'SD',
  version: '0.1.0',
  stage: TemplateStage.Experimental,
  enabled: false,
  description: 'shared world · multiple writers',
  pickerOrder: 5,
  sections: [
    { label: 'Manuscript', order: 0 },
    { label: 'Shared world', order: 1 },
    { label: 'Together', order: 2 },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', name: 'My door — fifth' },
    { sectionLabel: 'Manuscript', name: "Rae's door — second" },
    { sectionLabel: 'Manuscript', name: "Kit's door — third" },
    { sectionLabel: 'Shared world', name: 'Characters' },
    { sectionLabel: 'Shared world', name: 'Places' },
    { sectionLabel: 'Shared world', name: 'Common lore' },
    { sectionLabel: 'Together', name: 'Chat' },
  ],
  noteKinds: [
    NoteKind.Note,
    NoteKind.Char,
    NoteKind.Place,
    NoteKind.Lore,
    NoteKind.Blank,
  ],
};

export default template;
