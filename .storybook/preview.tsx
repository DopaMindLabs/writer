import type { Preview, Decorator } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
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
  decorators: [withTheme, withRouter],
};

export default preview;
