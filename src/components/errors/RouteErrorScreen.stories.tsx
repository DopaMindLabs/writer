import type { Meta, StoryObj } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { EnvelopeIntegrityError } from '@/lib/cloud/crypto/envelope';
import { RouteErrorScreen } from './RouteErrorScreen';

const Thrower = ({ error }: { error: unknown }): never => {
  throw error;
};

const routerFor = (error: unknown) =>
  createMemoryRouter(
    [
      {
        path: '/',
        element: <Thrower error={error} />,
        errorElement: <RouteErrorScreen />,
      },
    ],
    { initialEntries: ['/'] },
  );

const meta = {
  title: 'Errors/RouteErrorScreen',
  component: RouteErrorScreen,
  render: () => <RouterProvider router={routerFor(new Error('Unexpected failure'))} />,
} satisfies Meta<typeof RouteErrorScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GenericError: Story = {};

export const CloudKeyFailure: Story = {
  render: () => <RouterProvider router={routerFor(new EnvelopeIntegrityError())} />,
};
