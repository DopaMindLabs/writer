import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { SettingsTabs, type SettingsTabGroup } from './SettingsTabs';

const groups: SettingsTabGroup[] = [
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

describe('SettingsTabs', () => {
  describe('rendering', () => {
    it('should render the group headers in the desktop nav', () => {
      renderWithProviders(
        <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
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
        <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
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
        <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
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
        <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
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
        <SettingsTabs groups={groups} active="general" onSelect={onSelect} />,
      );
      await userEvent.click(screen.getByTestId('settings-tab-sync'));
      expect(onSelect).toHaveBeenCalledWith('sync');
    });

    it('should call onSelect with the tab id when a mobile tab is clicked', async () => {
      const onSelect = vi.fn();
      renderWithProviders(
        <SettingsTabs groups={groups} active="general" onSelect={onSelect} />,
      );
      await userEvent.click(screen.getByTestId('settings-tab-mobile-sync'));
      expect(onSelect).toHaveBeenCalledWith('sync');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = renderWithProviders(
        <SettingsTabs groups={groups} active="editor" onSelect={() => {}} />,
      );
      expect(container).toMatchSnapshot('active=editor');
    });
  });
});
