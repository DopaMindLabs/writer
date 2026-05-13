import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'bioinformatics',
  label: 'Bioinformatics',
  tag: 'BX',
  version: '0.1.0',
  stage: TemplateStage.Experimental,
  enabled: false,
  description: 'pipelines · methods · lab notebook',
  pickerOrder: 1,
  sections: [
    { label: 'Manuscript', order: 0 },
    {
      label: 'Methods',
      order: 1,
      sections: [
        { label: 'Pipeline', order: 0, defaultDocName: 'Step' },
        { label: 'Stats', order: 1, defaultDocName: 'Analysis' },
      ],
    },
    { label: 'Data', order: 2 },
    { label: 'Results', order: 3 },
    { label: 'References', order: 4 },
    { label: 'Notebook', order: 5, defaultDocName: 'Lab notes — {{date}}' },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', name: 'Abstract' },
    { sectionLabel: 'Manuscript', name: 'Introduction' },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Quality control',
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Alignment',
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Pipeline',
      name: 'Variant calling',
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Stats',
      name: 'Differential expression',
    },
    {
      sectionLabel: 'Methods',
      subsectionLabel: 'Stats',
      name: 'Multiple testing',
    },
    { sectionLabel: 'Data', name: 'Datasets & accessions' },
    { sectionLabel: 'Results', name: 'Findings' },
    { sectionLabel: 'Notebook', name: 'Lab notes — day 1' },
  ],
};

export default template;
