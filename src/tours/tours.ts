export const TOUR_IDS = ['welcome', 'writer', 'citations', 'brainspace'] as const;

export type TourId = (typeof TOUR_IDS)[number];

export interface TourStep {
  element?: string;
  titleKey: string;
  bodyKey: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export interface TourDefinition {
  id: TourId;
  titleKey: string;
  descriptionKey: string;
  steps: TourStep[];
}

export const TOURS: Record<TourId, TourDefinition> = {
  welcome: {
    id: 'welcome',
    titleKey: 'welcome.title',
    descriptionKey: 'welcome.description',
    steps: [
      {
        titleKey: 'welcome.intro.title',
        bodyKey: 'welcome.intro.body',
      },
      {
        element: '[data-tour="tour-continue-writing"]',
        titleKey: 'welcome.continue.title',
        bodyKey: 'welcome.continue.body',
        side: 'bottom',
        align: 'start',
      },
      {
        element: '[data-tour="tour-start-space"]',
        titleKey: 'welcome.startSpace.title',
        bodyKey: 'welcome.startSpace.body',
        side: 'top',
        align: 'start',
      },
    ],
  },
  writer: {
    id: 'writer',
    titleKey: 'writer.title',
    descriptionKey: 'writer.description',
    steps: [
      {
        titleKey: 'writer.intro.title',
        bodyKey: 'writer.intro.body',
      },
      {
        element: '[data-tour="tour-sidebar-space-title"]',
        titleKey: 'writer.spaceTitle.title',
        bodyKey: 'writer.spaceTitle.body',
        side: 'right',
        align: 'start',
      },
      {
        element: '[data-tour="tour-sidebar-sections"]',
        titleKey: 'writer.sections.title',
        bodyKey: 'writer.sections.body',
        side: 'right',
        align: 'start',
      },
      {
        element: '[data-tour="tour-sidebar-settings"]',
        titleKey: 'writer.settings.title',
        bodyKey: 'writer.settings.body',
        side: 'right',
        align: 'start',
      },
      {
        element: '[data-tour="tour-topbar-modes"]',
        titleKey: 'writer.modes.title',
        bodyKey: 'writer.modes.body',
        side: 'bottom',
        align: 'center',
      },
      {
        element: '[data-tour="tour-topbar-citations"]',
        titleKey: 'writer.citations.title',
        bodyKey: 'writer.citations.body',
        side: 'bottom',
        align: 'end',
      },
      {
        element: '[data-tour="tour-topbar-theme"]',
        titleKey: 'writer.theme.title',
        bodyKey: 'writer.theme.body',
        side: 'bottom',
        align: 'end',
      },
      {
        element: '[data-tour="tour-editor-main"]',
        titleKey: 'writer.editor.title',
        bodyKey: 'writer.editor.body',
        side: 'top',
        align: 'center',
      },
    ],
  },
  citations: {
    id: 'citations',
    titleKey: 'citations.title',
    descriptionKey: 'citations.description',
    steps: [
      {
        titleKey: 'citations.intro.title',
        bodyKey: 'citations.intro.body',
      },
      {
        element: '[data-tour="tour-citations-add"]',
        titleKey: 'citations.add.title',
        bodyKey: 'citations.add.body',
        side: 'bottom',
        align: 'start',
      },
      {
        element: '[data-tour="tour-citations-list"]',
        titleKey: 'citations.list.title',
        bodyKey: 'citations.list.body',
        side: 'top',
        align: 'center',
      },
    ],
  },
  brainspace: {
    id: 'brainspace',
    titleKey: 'brainspace.title',
    descriptionKey: 'brainspace.description',
    steps: [
      {
        titleKey: 'brainspace.intro.title',
        bodyKey: 'brainspace.intro.body',
      },
      {
        element: '[data-tour="tour-brainspace-add-note"]',
        titleKey: 'brainspace.addNote.title',
        bodyKey: 'brainspace.addNote.body',
        side: 'bottom',
        align: 'start',
      },
      {
        element: '[data-tour="tour-brainspace-canvas"]',
        titleKey: 'brainspace.canvas.title',
        bodyKey: 'brainspace.canvas.body',
        side: 'top',
        align: 'center',
      },
    ],
  },
};
