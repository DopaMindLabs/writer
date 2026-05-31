import { renderWithProviders, screen } from '@/test/test-utils';
import { SettingRow } from './SettingRow';

describe('SettingRow', () => {
  it('renders label, hint, and children', () => {
    renderWithProviders(
      <SettingRow label="Theme" hint="Light or dark">
        <span>child</span>
      </SettingRow>,
    );
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Light or dark')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('omits the hint container when no hint is provided', () => {
    renderWithProviders(
      <SettingRow label="Plain">
        <span>child</span>
      </SettingRow>,
    );
    expect(screen.queryByText('Light or dark')).not.toBeInTheDocument();
  });

  it('adds disabled styling when disabled=true', () => {
    const { container } = renderWithProviders(
      <SettingRow label="L" disabled>
        <span>c</span>
      </SettingRow>,
    );
    expect(container.firstChild).toHaveClass('cursor-not-allowed', 'opacity-60');
  });

  describe('snapshot', () => {
    it('should match the snapshot across hint, no-hint, and disabled variants', () => {
      const { container } = renderWithProviders(
        <div>
          <SettingRow label="With hint" hint="Helpful detail">
            <span>child</span>
          </SettingRow>
          <SettingRow label="No hint">
            <span>child</span>
          </SettingRow>
          <SettingRow label="Disabled" hint="Coming soon" disabled>
            <span>child</span>
          </SettingRow>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
