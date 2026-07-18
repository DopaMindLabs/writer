import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RootLayout } from './RootLayout';

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
});
