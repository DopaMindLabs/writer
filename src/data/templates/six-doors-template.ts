import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'six',
  label: 'Six Doors · collaborative',
  tag: 'SD',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: false,
  description: 'shared world · multiple writers',
  pickerOrder: 5,
  allowConfiguration: true,
  sections: [
    { label: 'Manuscript', order: 0, defaultDocName: '' },
    { label: 'Shared world', order: 1, defaultDocName: '' },
    { label: 'Together', order: 2, defaultDocName: '' },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: 'My door — fifth', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: "Rae's door — second", body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Manuscript', subsectionLabel: '', name: "Kit's door — third", body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Shared world', subsectionLabel: '', name: 'Characters', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Shared world', subsectionLabel: '', name: 'Places', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Shared world', subsectionLabel: '', name: 'Common lore', body: EMPTY_LEXICAL_JSON },
    { sectionLabel: 'Together', subsectionLabel: '', name: 'Chat', body: EMPTY_LEXICAL_JSON },
  ],
  seedNotes: [],
  noteKinds: [
    NoteKind.Note,
    NoteKind.Char,
    NoteKind.Place,
    NoteKind.Lore,
    NoteKind.Blank,
    NoteKind.Image,
  ],
};

export default template;
