import { fireEvent } from '@testing-library/react';
import { renderWithProviders, screen } from '@/test/test-utils';
import { FocusToggle, ModeTabs } from './ModeToggle';

describe('ModeTabs', () => {
  it('renders write/read/split/space tabs with active state', () => {
    const { container } = renderWithProviders(
      <ModeTabs mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('hides per-doc tabs when docId is null', () => {
    const { container } = renderWithProviders(
      <ModeTabs mode="dump" spaceId="s1" docId={null} />,
      { initialEntries: ['/s/s1/brain-space'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('renders icon-only tabs with tooltips in focus mode', () => {
    const { container } = renderWithProviders(
      <ModeTabs mode="focus" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1?focus=1'] },
    );
    expect(container).toMatchSnapshot();
  });
});

describe('FocusToggle', () => {
  it('renders focus enter link in write mode', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('renders icon-only exit-focus link when focused', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="focus" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1?focus=1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('returns null in read mode', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="read" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1/read'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('returns null in write mode when docId is missing', () => {
    const { container } = renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId={null} />,
      { initialEntries: ['/s'] },
    );
    expect(container.firstChild).toBeNull();
  });

  it('navigates into focus mode via the Cmd+\\ shortcut (macOS)', () => {
    renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    // Before the shortcut the toggle links *into* focus mode (focus=1 set).
    expect(screen.getByTestId('focus-toggle')).toHaveAttribute(
      'href',
      expect.stringContaining('focus=1'),
    );

    fireEvent.keyDown(window, { key: '\\', metaKey: true });

    // After navigating, the URL carries focus=1, so the toggle now links back
    // *out* of focus mode. Asserting the href flipped proves navigation ran —
    // a no-op handler would leave focus=1 in place.
    const toggle = screen.getByTestId('focus-toggle');
    expect(toggle).toHaveAttribute(
      'href',
      expect.not.stringContaining('focus=1'),
    );
    expect(toggle).toHaveAttribute('href', '/s/s1/d/d1');
  });

  it('navigates into focus mode via the Ctrl+\\ shortcut (Linux/Windows)', () => {
    renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    fireEvent.keyDown(window, { key: '\\', ctrlKey: true });
    expect(screen.getByTestId('focus-toggle')).toHaveAttribute(
      'href',
      '/s/s1/d/d1',
    );
  });

  it('ignores the backslash key without a modifier', () => {
    renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    fireEvent.keyDown(window, { key: '\\' });
    // No modifier means no navigation: the toggle still links into focus mode.
    expect(screen.getByTestId('focus-toggle')).toHaveAttribute(
      'href',
      expect.stringContaining('focus=1'),
    );
  });

  it('renders the dump mode link with the right href', () => {
    renderWithProviders(
      <FocusToggle mode="dump" spaceId="s1" docId={null} />,
      { initialEntries: ['/s/s1/brain-space'] },
    );
    expect(
      screen.getByRole('link', { name: /enter focus|focus/i }),
    ).toHaveAttribute('href', expect.stringContaining('/s/s1/brain-space'));
  });
});
