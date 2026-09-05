import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { pwaUpdateState } from '@/lib/pwa/updateState';

afterEach(() => {
  pwaUpdateState.set(false);
});

const routerWithChild = () =>
  createMemoryRouter(
    [
      {
        element: <RootLayout />,
        children: [{ index: true, element: <div>route child</div> }],
      },
    ],
    { initialEntries: ['/'] },
  );

describe('RootLayout', () => {
  it('renders the matched child route through the outlet', () => {
    const { getByText } = render(<RouterProvider router={routerWithChild()} />);
    expect(getByText('route child')).toBeInTheDocument();
  });

  it('exposes a skip-to-content link as the first focusable element', () => {
    const { getByRole } = render(<RouterProvider router={routerWithChild()} />);
    const link = getByRole('link', { name: 'Skip to content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('does not show the update banner by default', () => {
    const { queryByTestId } = render(<RouterProvider router={routerWithChild()} />);
    expect(queryByTestId('pwa-update-banner')).not.toBeInTheDocument();
  });

  it('shows the update banner once an app update is ready', () => {
    pwaUpdateState.set(true);
    const { getByTestId } = render(<RouterProvider router={routerWithChild()} />);
    expect(getByTestId('pwa-update-banner')).toBeInTheDocument();
  });
});
