import { vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

vi.mock('@/db/seed', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/seed')>();
  return {
    ...actual,
    resetAndReseed: vi.fn(async () => {}),
  };
});

vi.mock('@/editor/EditorFacade', () => ({
  Editor: () => <div data-testid="editor-stub" />,
}));

const { App } = await import('./App');
const { resetAndReseed } = await import('@/db/seed');

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    vi.mocked(resetAndReseed).mockClear();
  });

  it('renders ready state with the router', async () => {
    const { findByText } = render(<App />);
    expect(await findByText(/LIpsum/)).toBeInTheDocument();
  });

  it('calls resetAndReseed when ?reseed=1 query param is present', async () => {
    window.history.replaceState({}, '', '/?reseed=1');
    render(<App />);
    await waitFor(() => expect(resetAndReseed).toHaveBeenCalled());
    // Param is stripped after reset.
    expect(window.location.search).not.toContain('reseed');
  });

  it('renders boot error when reseed throws', async () => {
    vi.mocked(resetAndReseed).mockRejectedValueOnce(new Error('boom'));
    window.history.replaceState({}, '', '/?reseed=1');
    const { findByText } = render(<App />);
    expect(await findByText('Boot error')).toBeInTheDocument();
    expect(await findByText('boom')).toBeInTheDocument();
  });
});
