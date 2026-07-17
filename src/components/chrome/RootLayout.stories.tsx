import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './RootLayout';

const routerWithChild = () =>
  createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: (
              <main id="main-content" className="p-8 font-sans text-ink">
                Route content renders inside the layout outlet.
              </main>
            ),
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  );

const meta = {
  title: 'Chrome/RootLayout',
  component: RootLayout,
  parameters: { layout: 'fullscreen' },
  tags: ['!autodocs'],
  render: () => <RouterProvider router={routerWithChild()} />,
} satisfies Meta<typeof RootLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
