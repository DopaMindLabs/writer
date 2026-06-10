import { vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders ready state with the router', async () => {
    const { findByText } = render(<App />);
    expect(await findByText(/LIpsum/)).toBeInTheDocument();
  });

  it('renders a skip-to-content link as the first focusable element', async () => {
    const { findByRole } = render(<App />);
    const link = await findByRole('link', { name: 'Skip to content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  // Vitest runs with DEV=true, so the reseed param is honoured here.
  it('calls resetAndReseed when ?reseed=1 query param is present', async () => {
    window.history.replaceState({}, '', '/?reseed=1');
    render(<App />);
    await waitFor(() => { expect(resetAndReseed).toHaveBeenCalled(); });
    // Param is stripped after reset.
    expect(window.location.search).not.toContain('reseed');
  });

  it('ignores ?reseed=1 in production builds', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_E2E', '');
    window.history.replaceState({}, '', '/?reseed=1');
    const { findByText } = render(<App />);
    expect(await findByText(/LIpsum/)).toBeInTheDocument();
    expect(resetAndReseed).not.toHaveBeenCalled();
  });

  it('honours ?reseed=1 in the e2e build (VITE_E2E=1)', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_E2E', '1');
    window.history.replaceState({}, '', '/?reseed=1');
    render(<App />);
    await waitFor(() => { expect(resetAndReseed).toHaveBeenCalled(); });
  });

  it('renders boot error when reseed throws', async () => {
    vi.mocked(resetAndReseed).mockRejectedValueOnce(new Error('boom'));
    window.history.replaceState({}, '', '/?reseed=1');
    const { findByText } = render(<App />);
    expect(await findByText('Boot error')).toBeInTheDocument();
    expect(await findByText('boom')).toBeInTheDocument();
  });

  it('recovers from a boot error via the confirmed reset action', async () => {
    const user = userEvent.setup();
    vi.mocked(resetAndReseed).mockRejectedValueOnce(new Error('boom'));
    window.history.replaceState({}, '', '/?reseed=1');
    const { findByRole, findByText } = render(<App />);

    await user.click(
      await findByRole('button', { name: 'Reset local data…' }),
    );
    expect(resetAndReseed).toHaveBeenCalledTimes(1);

    await user.click(
      await findByRole('button', { name: 'Erase everything' }),
    );
    await waitFor(() => { expect(resetAndReseed).toHaveBeenCalledTimes(2); });
    expect(await findByText(/LIpsum/)).toBeInTheDocument();
  });
});
