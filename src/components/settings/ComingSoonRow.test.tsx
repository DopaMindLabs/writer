import { renderWithProviders, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { ComingSoonRow } from './ComingSoonRow';

describe('ComingSoonRow', () => {
  describe('rendering', () => {
    it('should render the label, hint, disabled checkbox, help button, and badge', () => {
      renderWithProviders(
        <ComingSoonRow label="Sync" hint="cloud sync" tooltip="Coming later" />,
      );
      expect(screen.getByTestId('coming-soon-row-label')).toHaveTextContent(
        'Sync',
      );
      expect(screen.getByTestId('coming-soon-row-hint')).toHaveTextContent(
        'cloud sync',
      );
      const checkbox = screen.getByTestId('coming-soon-row-checkbox');
      expect(checkbox).toBeDisabled();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      // The control carries an accessible name so screen readers (and axe)
      // can identify it even though the row label sits in a sibling element.
      expect(checkbox).toHaveAccessibleName('Sync');
      expect(screen.getByTestId('coming-soon-row-help')).toHaveAttribute(
        'aria-label',
      );
      expect(screen.getByTestId('coming-soon-badge')).toHaveTextContent(
        /coming soon/i,
      );
    });

    it('should omit the hint when no hint prop is passed', () => {
      renderWithProviders(
        <ComingSoonRow label="Sync" tooltip="Coming later" />,
      );
      expect(screen.queryByTestId('coming-soon-row-hint')).toBeNull();
    });
  });

  describe('tooltip', () => {
    it('should show the tooltip content on hover of the help button', async () => {
      renderWithProviders(
        <ComingSoonRow label="Sync" tooltip="Coming soon: cloud sync" />,
      );
      await userEvent.hover(screen.getByTestId('coming-soon-row-help'));
      const tip = await screen.findByTestId('coming-soon-row-tooltip');
      expect(tip).toHaveTextContent('Coming soon: cloud sync');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container: withHint } = renderWithProviders(
        <ComingSoonRow label="Sync" hint="cloud sync" tooltip="Coming later" />,
      );
      expect(withHint).toMatchSnapshot('with hint');

      const { container: withoutHint } = renderWithProviders(
        <ComingSoonRow label="Sync" tooltip="Coming later" />,
      );
      expect(withoutHint).toMatchSnapshot('without hint');
    });
  });
});
