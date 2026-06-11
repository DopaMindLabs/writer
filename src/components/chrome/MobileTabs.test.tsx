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

  describe('rendering', () => {
    it('should expose the mobile-tabs testid wrapper', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(screen.getByTestId('mobile-tabs')).toBeInTheDocument();
    });

    it('should render write/read/brain as links with computed hrefs when spaceId and docId are present', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      const write = screen.getByTestId('mobile-tabs-write');
      expect(write.tagName).toBe('A');
      expect(write).toHaveAttribute('href', '/s/s1/d/d1');
      const read = screen.getByTestId('mobile-tabs-read');
      expect(read.tagName).toBe('A');
      expect(read).toHaveAttribute('href', '/s/s1/d/d1/read');
      const brain = screen.getByTestId('mobile-tabs-brain');
      expect(brain.tagName).toBe('A');
      expect(brain).toHaveAttribute('href', '/s/s1/dump');
    });

    it('should not render a split tab (mobile split is deferred to its own PR)', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(screen.queryByTestId('mobile-tabs-split')).not.toBeInTheDocument();
    });

    it('should degrade read to a <button> when there is no docId; write falls back to /s/:spaceId', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
        initialEntries: ['/s/s1'],
      });
      expect(screen.getByTestId('mobile-tabs-write')).toHaveAttribute(
        'href',
        '/s/s1',
      );
      expect(screen.getByTestId('mobile-tabs-read').tagName).toBe('BUTTON');
      expect(screen.getByTestId('mobile-tabs-brain')).toHaveAttribute(
        'href',
        '/s/s1/dump',
      );
    });

    it('should degrade read and brain to buttons when there is no spaceId; write falls back to "/"', () => {
      renderWithProviders(<MobileTabs spaceId={null} docId={null} />, {
        initialEntries: ['/'],
      });
      expect(screen.getByTestId('mobile-tabs-write')).toHaveAttribute(
        'href',
        '/',
      );
      expect(screen.getByTestId('mobile-tabs-read').tagName).toBe('BUTTON');
      expect(screen.getByTestId('mobile-tabs-brain').tagName).toBe('BUTTON');
    });
  });

  describe('behaviour', () => {
    it('should open the citations drawer when the cite button is clicked', async () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(useUI.getState().citationsDrawerOpen).toBe(false);
      await userEvent.click(screen.getByTestId('mobile-tabs-cite'));
      expect(useUI.getState().citationsDrawerOpen).toBe(true);
    });

    it('should open the mobile-more drawer when the more button is clicked', async () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(useUI.getState().mobileMoreOpen).toBe(false);
      await userEvent.click(screen.getByTestId('mobile-tabs-more'));
      expect(useUI.getState().mobileMoreOpen).toBe(true);
    });
  });

  describe('active state', () => {
    it('should mark write as aria-current on a doc route', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1'],
      });
      expect(screen.getByTestId('mobile-tabs-write')).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(
        screen.getByTestId('mobile-tabs-read').getAttribute('aria-current'),
      ).toBeNull();
    });

    it('should mark read as aria-current on a /read route', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId="d1" />, {
        initialEntries: ['/s/s1/d/d1/read'],
      });
      expect(screen.getByTestId('mobile-tabs-read')).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('should mark brain as aria-current on a /dump route', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
        initialEntries: ['/s/s1/dump'],
      });
      expect(screen.getByTestId('mobile-tabs-brain')).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('should mark cite as aria-pressed (button) on a /citations route', () => {
      renderWithProviders(<MobileTabs spaceId="s1" docId={null} />, {
        initialEntries: ['/s/s1/citations'],
      });
      expect(screen.getByTestId('mobile-tabs-cite')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: withDoc } = renderWithProviders(
        <MobileTabs spaceId="s1" docId="d1" />,
        { initialEntries: ['/s/s1/d/d1'] },
      );
      expect(withDoc).toMatchSnapshot('with doc and space');

      const { container: spaceOnly } = renderWithProviders(
        <MobileTabs spaceId="s1" docId={null} />,
        { initialEntries: ['/s/s1'] },
      );
      expect(spaceOnly).toMatchSnapshot('space only');

      const { container: none } = renderWithProviders(
        <MobileTabs spaceId={null} docId={null} />,
        { initialEntries: ['/'] },
      );
      expect(none).toMatchSnapshot('no space');
    });
  });
});
