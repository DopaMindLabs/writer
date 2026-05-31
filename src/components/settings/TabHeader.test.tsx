import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { TabHeader } from './TabHeader';

describe('TabHeader', () => {
  it('renders the translated title and subtitle with the default breadcrumb', () => {
    renderWithProviders(
      <TabHeader
        titleKey="settings.sync.title"
        subtitleKey="settings.sync.subtitle"
      />,
    );
    expect(screen.queryByText('settings.sync.title')).not.toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('uses the supplied breadcrumb key when provided', () => {
    const { container } = renderWithProviders(
      <TabHeader
        titleKey="settings.space.sync.title"
        subtitleKey="settings.space.sync.subtitle"
        breadcrumbKey="settings.space.breadcrumb"
      />,
    );
    expect(container.textContent).not.toContain('settings.space.breadcrumb');
    expect(container.textContent).not.toBe('');
  });

  describe('snapshot', () => {
    it('should match the snapshot for global and space breadcrumb variants', () => {
      const { container } = renderWithProviders(
        <div>
          <TabHeader
            titleKey="settings.sync.title"
            subtitleKey="settings.sync.subtitle"
          />
          <TabHeader
            titleKey="settings.space.sync.title"
            subtitleKey="settings.space.sync.subtitle"
            breadcrumbKey="settings.space.breadcrumb"
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
