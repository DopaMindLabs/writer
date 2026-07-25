import { act } from '@testing-library/react';
import {
  renderWithProviders,
  screen,
  waitFor,
  fireEvent,
} from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { seedBasicSpace } from '@/test/fixtures';
import { MobileInspectorDrawer } from './MobileInspectorDrawer';

const openAfterMount = async () => {
  await act(async () => {
    useUI.getState().setMobileInspectorOpen(true);
    await Promise.resolve();
  });
};

describe('MobileInspectorDrawer', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setMobileInspectorOpen(false);
    });
  });

  it('renders nothing when closed', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileInspectorDrawer docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(
      screen.queryByTestId('mobile-inspector-drawer'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing without a doc even when open', async () => {
    renderWithProviders(<MobileInspectorDrawer docId={null} />, {
      initialEntries: ['/s/s1'],
    });
    await openAfterMount();
    expect(
      screen.queryByTestId('mobile-inspector-drawer'),
    ).not.toBeInTheDocument();
  });

  it('renders the doc inspector for the active doc when open', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileInspectorDrawer docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await openAfterMount();
    await screen.findByTestId('mobile-inspector-drawer');
    expect(screen.getByTestId('doc-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('doc-inspector-name')).toHaveTextContent(
      'Sample Doc',
    );
  });

  it('closes on Escape', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileInspectorDrawer docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await openAfterMount();
    await screen.findByTestId('mobile-inspector-drawer');
    act(() => { (document.activeElement as HTMLElement | null)?.blur(); });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(useUI.getState().mobileInspectorOpen).toBe(false);
    });
  });
});

describe('snapshot', () => {
  it('matches the open inspector drawer', async () => {
    await seedBasicSpace();
    renderWithProviders(<MobileInspectorDrawer docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    await openAfterMount();
    const drawer = await screen.findByTestId('mobile-inspector-drawer');
    // Radix's DismissableLayer sets `pointer-events` on the modal layer from a
    // post-mount effect; wait for it to settle so the snapshot is deterministic
    // rather than racing the effect (which flakes the inline style on CI).
    await waitFor(() => {
      expect(drawer).toHaveStyle({ pointerEvents: 'auto' });
    });
    expect(drawer).toMatchSnapshot();
  });
});
