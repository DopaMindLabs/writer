import type { Template } from './types';

const template: Template = {
  id: 'humanities',
  label: 'Thesis · research',
  tag: 'TH',
  description: 'long-form academic',
  pickerOrder: 3,
  sections: [
    { label: 'Manuscript', order: 0 },
    { label: 'Sources', order: 1 },
    { label: 'Arguments', order: 2 },
    { label: 'Workshop', order: 3 },
  ],
  seedDocs: [
    { sectionLabel: 'Manuscript', name: 'Silence as governance' },
    { sectionLabel: 'Manuscript', name: 'Working argument' },
    { sectionLabel: 'Manuscript', name: 'Outline v2' },
    { sectionLabel: 'Sources', name: 'Primary texts' },
    { sectionLabel: 'Sources', name: 'Secondary lit.' },
    { sectionLabel: 'Arguments', name: 'Thesis' },
    { sectionLabel: 'Arguments', name: 'Counter-args' },
    { sectionLabel: 'Arguments', name: 'Open questions' },
    { sectionLabel: 'Workshop', name: 'Sessions' },
  ],
};

export default template;
