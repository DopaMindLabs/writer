import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { NavTabs, type NavTabGroup } from './NavTabs';

const groups: NavTabGroup[] = [
  {
    label: 'Preferences',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'editor', label: 'Editor' },
    ],
  },
  {
    label: 'Data',
    tabs: [{ id: 'sync', label: 'Sync' }],
  },
];

describe('NavTabs', () => {
  describe('rendering', () => {
    it('should render the group headers in the desktop nav', () => {
      renderWithProviders(
        <NavTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(screen.getByTestId('settings-tabs-group-0')).toHaveTextContent(
        'Preferences',
      );
      expect(screen.getByTestId('settings-tabs-group-1')).toHaveTextContent(
        'Data',
      );
    });

    it('should render each tab in both mobile and desktop strips', () => {
      renderWithProviders(
        <NavTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(screen.getByTestId('settings-tab-general')).toHaveTextContent(
        'General',
      );
      expect(screen.getByTestId('settings-tab-editor')).toHaveTextContent(
        'Editor',
      );
      expect(screen.getByTestId('settings-tab-sync')).toHaveTextContent('Sync');

      expect(
        screen.getByTestId('settings-tab-mobile-general'),
      ).toHaveTextContent('General');
      expect(screen.getByTestId('settings-tab-mobile-editor')).toHaveTextContent(
        'Editor',
      );
      expect(screen.getByTestId('settings-tab-mobile-sync')).toHaveTextContent(
        'Sync',
      );
    });
  });

  describe('active state', () => {
    it('should mark the active desktop tab with aria-current="page" and leave others unset', () => {
      renderWithProviders(
        <NavTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(
        screen.getByTestId('settings-tab-editor').getAttribute('aria-current'),
      ).toBe('page');
      expect(
        screen.getByTestId('settings-tab-general').getAttribute('aria-current'),
      ).toBeNull();
    });

    it('should mark the matching mobile tab with aria-current="page"', () => {
      renderWithProviders(
        <NavTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(
        screen
          .getByTestId('settings-tab-mobile-editor')
          .getAttribute('aria-current'),
      ).toBe('page');
    });
  });

  describe('behaviour', () => {
    it('should call onSelect with the tab id when a desktop tab is clicked', async () => {
      const onSelect = vi.fn();
      renderWithProviders(
        <NavTabs groups={groups} active="general" onSelect={onSelect} />,
      );
      await userEvent.click(screen.getByTestId('settings-tab-sync'));
      expect(onSelect).toHaveBeenCalledWith('sync');
    });

    it('should call onSelect with the tab id when a mobile tab is clicked', async () => {
      const onSelect = vi.fn();
      renderWithProviders(
        <NavTabs groups={groups} active="general" onSelect={onSelect} />,
      );
      await userEvent.click(screen.getByTestId('settings-tab-mobile-sync'));
      expect(onSelect).toHaveBeenCalledWith('sync');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderWithProviders(
        <NavTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(container).toMatchSnapshot('active=editor');
    });
  });
});
