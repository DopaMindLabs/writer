import type { Template } from './types';

const template: Template = {
  id: 'blank',
  label: 'Blank',
  tag: 'BL',
  description: 'start from nothing',
  pickerOrder: 8,
  sections: [{ label: 'Notes', order: 0 }],
  seedDocs: [{ sectionLabel: 'Notes', name: 'Untitled' }],
};

export default template;
