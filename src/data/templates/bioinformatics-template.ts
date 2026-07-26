import { NoteKind } from '@/db/schema';
import { EMPTY_LEXICAL_JSON } from '@/lib/docs';
import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'bioinformatics',
  label: 'Bioinformatics',
  tag: 'BX',
  version: '0.1.0',
  stage: TemplateStage.Alpha,
  enabled: false,
  description: 'pipelines · methods · lab notebook',
  pickerOrder: 1,
  sections: [
    { label: 'Manuscript', order: 0, defaultDocName: '' },
    {
      label: 'Methods',
      order: 1,
      sections: [
        { label: 'Pipeline', order: 0, defaultDocName: 'Step' },
        { label: 'Stats', order: 1, defaultDocName: 'Analysis' },
      ],
      defaultDocName: '',
    },
    { label: 'Data', order: 2, defaultDocName: '' },
    { label: 'Results', order: 3, defaultDocName: '' },
    { label: 'References', order: 4, defaultDocName: '' },
    {
      label: 'Notebook',
      order: 5,
      defaultDocName: 'Lab notes — {{date}}',
    },
  ],
  seedDocs: [
    {
      sectionLabel: 'Manuscript',
      subsectionLabel: '',
      name: 'Abstract',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Manuscript',
      subsectionLabel: '',
      name: 'Introduction',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Quality control',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Alignment',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Variant calling',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Stats',
      name: 'Differential expression',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Stats',
      name: 'Multiple testing',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Data',
      subsectionLabel: '',
      name: 'Datasets & accessions',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Results',
      subsectionLabel: '',
      name: 'Findings',
      body: EMPTY_LEXICAL_JSON,
    },
    {
      sectionLabel: 'Notebook',
      subsectionLabel: '',
      name: 'Lab notes — day 1',
      body: EMPTY_LEXICAL_JSON,
    },
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
  allowConfiguration: true,
};

export default template;
