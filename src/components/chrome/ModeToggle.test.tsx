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

  it('toggles focus via Cmd+\\ keyboard shortcut', () => {
    renderWithProviders(
      <FocusToggle mode="write" spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    fireEvent.keyDown(window, { key: '\\', metaKey: true });
    expect(
      screen.getByRole('link', { name: /enter focus|focus/i }),
    ).toBeInTheDocument();
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
