import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { EnvelopeIntegrityError } from '@/lib/cloud/crypto/envelope';
import { CloudKeyMismatchError } from '@/lib/cloud/crypto/errors';

vi.mock('@/lib/cloud/cloudClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/cloud/cloudClient')>();
  return { ...actual, resetCloudDevice: vi.fn(async () => {}) };
});

const { RouteErrorScreen } = await import('./RouteErrorScreen');
const { resetCloudDevice } = await import('@/lib/cloud/cloudClient');

const Thrower = ({ error }: { error: unknown }): never => {
  throw error;
};

const clickReset = async (): Promise<void> => {
  await userEvent.click(
    screen.getByRole('button', { name: /reset this device instead/i }),
  );
  await userEvent.click(screen.getByTestId('confirm-dialog-confirm'));
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

describe('RouteErrorScreen reset flow', () => {
  let reload: ReturnType<typeof vi.fn>;
  let originalLocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.mocked(resetCloudDevice).mockReset();
    reload = vi.fn();
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        reload,
        assign: vi.fn(),
        href: 'http://localhost/',
        pathname: '/',
        search: '',
        hash: '',
      },
    });
  });

  afterEach(() => {
    vi.mocked(resetCloudDevice).mockReset();
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation);
    }
  });

  it('reloads only after the reset resolves', async () => {
    vi.mocked(resetCloudDevice).mockResolvedValue(undefined);
    renderWithError(new EnvelopeIntegrityError());

    await clickReset();

    expect(resetCloudDevice).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the recovery screen with an alert and does not reload when the reset fails', async () => {
    vi.mocked(resetCloudDevice).mockRejectedValue(new Error('reset failed'));
    renderWithError(new EnvelopeIntegrityError());

    await clickReset();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /couldn't reset this device/i,
    );
    expect(reload).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /unlock in settings/i }),
    ).toBeInTheDocument();
  });
});
