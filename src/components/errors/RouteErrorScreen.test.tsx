import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { EnvelopeIntegrityError } from '@/lib/cloud/crypto/envelope';
import { CloudKeyMismatchError } from '@/lib/cloud/crypto/errors';
import { RouteErrorScreen } from './RouteErrorScreen';

const Thrower = ({ error }: { error: unknown }): never => {
  throw error;
};

const renderWithError = (error: unknown) => {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Thrower error={error} />,
        errorElement: <RouteErrorScreen />,
      },
    ],
    { initialEntries: ['/'] },
  );
  return render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
};

describe('RouteErrorScreen', () => {
  it('shows the cloud recovery surface for a ciphertext authentication failure', () => {
    renderWithError(new EnvelopeIntegrityError());
    expect(
      screen.getByRole('button', { name: /unlock in settings/i }),
    ).toBeInTheDocument();
  });

  it('shows the cloud recovery surface for a detected key mismatch', () => {
    renderWithError(new CloudKeyMismatchError());
    expect(
      screen.getByRole('button', { name: /unlock in settings/i }),
    ).toBeInTheDocument();
  });

  it('shows a generic screen with the message for any other error', () => {
    renderWithError(new Error('kaboom'));
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /unlock in settings/i }),
    ).not.toBeInTheDocument();
  });
});
