import type { Template } from './types';

const template: Template = {
  id: 'journal',
  label: 'Journal',
  tag: 'JO',
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
};

export default template;
