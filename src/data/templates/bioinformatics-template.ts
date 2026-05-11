import type { Template } from './types';

const template: Template = {
  id: 'bioinformatics',
  label: 'Bioinformatics',
  tag: 'BX',
  description:
    'Manuscript, methods, data, results, and a lab notebook for computational biology projects.',
  sections: [
    { label: 'Manuscript', order: 0 },
    { label: 'Methods', order: 1 },
    { label: 'Data', order: 2 },
    { label: 'Results', order: 3 },
    { label: 'References', order: 4 },
    { label: 'Notebook', order: 5 },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', name: 'Abstract', body: '' },
    { sectionLabel: 'Manuscript', name: 'Introduction', body: '' },
    { sectionLabel: 'Methods', name: 'Pipeline overview', body: '' },
    { sectionLabel: 'Data', name: 'Datasets & accessions', body: '' },
    { sectionLabel: 'Results', name: 'Findings', body: '' },
    { sectionLabel: 'Notebook', name: 'Lab notes — day 1', body: '' },
  ],
};

export default template;
