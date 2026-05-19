import { act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { useUI } from '@/store/ui';
import { MobileTabs } from './MobileTabs';

describe('MobileTabs', () => {
  beforeEach(() => {
    act(() => {
      useUI.getState().setMobileMoreOpen(false);
      useUI.getState().closeCitationsDrawer();
    });
  });

  it('renders the bottom-tabs nav with all five tabs', () => {
    const { container } = renderWithProviders(
      <MobileTabs spaceId="s1" docId="d1" />,
      { initialEntries: ['/s/s1/d/d1'] },
    );
    expect(container).toMatchSnapshot();
  });

  it('exposes the mobile-tabs testid wrapper', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(screen.getByTestId('mobile-tabs')).toBeInTheDocument();
  });

  it('renders write/read/brain as links with computed hrefs when spaceId and docId are present', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1');
    expect(
      screen.getByRole('link', { name: /read/i }).getAttribute('href'),
    ).toBe('/s/s1/d/d1/read');
    expect(
      screen.getByRole('link', { name: /brain/i }).getAttribute('href'),
    ).toBe('/s/s1/dump');
  });

  it('degrades read to a <button> when there is no docId; write falls back to /s/:spaceId', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1'],
    });
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('href'),
    ).toBe('/s/s1');
    // read has no href -> button
    const read = screen.getByRole('button', { name: /read/i });
    expect(read.tagName).toBe('BUTTON');
    // brain still has a space-scoped href
    expect(
      screen.getByRole('link', { name: /brain/i }).getAttribute('href'),
    ).toBe('/s/s1/dump');
  });

  it('degrades read and brain to buttons when there is no spaceId; write falls back to "/"', () => {
    renderWithProviders(<MobileTabs spaceId={null} docId={null} />, {
      initialEntries: ['/'],
    });
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('href'),
    ).toBe('/');
    expect(screen.getByRole('button', { name: /read/i }).tagName).toBe(
      'BUTTON',
    );
    expect(screen.getByRole('button', { name: /brain/i }).tagName).toBe(
      'BUTTON',
    );
  });

  it('clicking the cite button opens the citations drawer', async () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(useUI.getState().citationsDrawerOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: /cite/i }));
    expect(useUI.getState().citationsDrawerOpen).toBe(true);
  });

  it('clicking the more button opens the mobile-more drawer', async () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(useUI.getState().mobileMoreOpen).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(useUI.getState().mobileMoreOpen).toBe(true);
  });

  it('marks write as aria-current on a doc route', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1'],
    });
    expect(
      screen.getByRole('link', { name: /write/i }).getAttribute('aria-current'),
    ).toBe('page');
    expect(
      screen.getByRole('link', { name: /read/i }).getAttribute('aria-current'),
    ).toBeNull();
  });

  it('marks read as aria-current on a /read route', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
      initialEntries: ['/s/s1/d/d1/read'],
    });
    expect(
      screen.getByRole('link', { name: /read/i }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('marks brain as aria-current on a /dump route', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1/dump'],
    });
    expect(
      screen.getByRole('link', { name: /brain/i }).getAttribute('aria-current'),
    ).toBe('page');
  });

  it('marks cite as aria-pressed (button) on a /citations route', () => {
    renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
      initialEntries: ['/s/s1/citations'],
    });
    expect(
      screen.getByRole('button', { name: /cite/i }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
