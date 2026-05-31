import type { Preview, Decorator, Loader } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '../src/components/ui/tooltip';
import { db } from '../src/db/db';
import {
  seedBasicSpace,
  seedMultipleSpaces,
  seedBrainSpaceCanvas,
} from '../src/test/fixtures';
import '../src/index.css';

const themes = ['light', 'dark', 'hc-light', 'hc-dark'] as const;
type ThemeId = (typeof themes)[number];

const withRouter: Decorator = (Story) => (
  <MemoryRouter initialEntries={['/']}>
    <Story />
  </MemoryRouter>
);

const withTheme: Decorator = (Story, context) => {
  const theme = (context.globals.theme as ThemeId) ?? 'light';
  return (
    <div data-theme={theme} className="bg-paper p-6 text-ink">
      <Story />
    </div>
  );
};

const withTooltip: Decorator = (Story) => (
  <TooltipProvider delayDuration={0}>
    <Story />
  </TooltipProvider>
);

// Stories for data-driven components opt into a Dexie seed via
// `parameters: { seed: 'basicSpace' }`. The loader clears every table and
// re-seeds from the shared test fixtures so the gallery renders real content.
const seeders = {
  basicSpace: seedBasicSpace,
  multipleSpaces: seedMultipleSpaces,
  brainSpace: seedBrainSpaceCanvas,
} satisfies Record<string, () => Promise<void>>;

export type SeedKey = keyof typeof seeders;

const seedLoader: Loader = async (context) => {
  const seed = context.parameters.seed as SeedKey | undefined;
  if (!seed) return {};
  await Promise.all(db.tables.map((table) => table.clear()));
  await seeders[seed]();
  return { seed };
};

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#ffffff' },
        { name: 'paper-2', value: '#fafafa' },
        { name: 'ink', value: '#111111' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Theme variant',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: themes.map((id) => ({ value: id, title: id })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme, withRouter, withTooltip],
  loaders: [seedLoader],
};

export default preview;
