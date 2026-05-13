import { TemplateStage, type Template } from './types';

const template: Template = {
  id: 'technical',
  label: 'Technical · Scientific report',
  tag: 'TX',
  version: '0.1.0',
  stage: TemplateStage.Experimental,
  enabled: true,
  description: 'Scientific · methods · equations',
  pickerOrder: 2,
  sections: [
    { label: 'Report', order: 0 },
    { label: 'Data & figures', order: 1 },
    { label: 'Code & math', order: 2 },
    { label: 'Workshop', order: 3 },
  ],
  seedDocs: [
    { sectionLabel: 'Report', name: 'Scientific report' },
    { sectionLabel: 'Report', name: 'Abstract' },
    { sectionLabel: 'Report', name: 'Methods' },
    { sectionLabel: 'Report', name: 'Results & figs' },
    { sectionLabel: 'Data & figures', name: 'Datasets' },
    { sectionLabel: 'Data & figures', name: 'Figures' },
    { sectionLabel: 'Data & figures', name: 'Tables' },
    { sectionLabel: 'Data & figures', name: 'Notebooks' },
    { sectionLabel: 'Code & math', name: 'Snippets' },
    { sectionLabel: 'Code & math', name: 'Equations' },
    { sectionLabel: 'Code & math', name: 'References' },
    { sectionLabel: 'Workshop', name: 'Sessions' },
  ],
};

export default template;
