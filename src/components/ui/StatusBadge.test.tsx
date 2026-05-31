import { render, screen } from '@/test/test-utils';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders a tinted pill with icon and label', () => {
    const { container } = render(<StatusBadge kind="success">OK</StatusBadge>);
    const label = screen.getByText('OK');
    const pill = label.parentElement;
    expect(pill).toHaveClass('bg-success-bg', 'text-success');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses the danger token for the error role', () => {
    render(<StatusBadge kind="error">FAILED</StatusBadge>);
    expect(screen.getByText('FAILED').parentElement).toHaveClass(
      'bg-danger-bg',
      'text-danger',
    );
  });

  it('hides the icon when glyph is false', () => {
    const { container } = render(
      <StatusBadge kind="info" glyph={false}>
        DRAFT
      </StatusBadge>,
    );
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  describe('snapshot', () => {
    it('should match the snapshot across kinds, sizes, and glyph states', () => {
      const { container } = render(
        <div>
          <StatusBadge kind="error">ERROR</StatusBadge>
          <StatusBadge kind="warning">WARNING</StatusBadge>
          <StatusBadge kind="success">SUCCESS</StatusBadge>
          <StatusBadge kind="info">INFO</StatusBadge>
          <StatusBadge kind="info" size="md">
            MEDIUM
          </StatusBadge>
          <StatusBadge kind="info" glyph={false}>
            NO GLYPH
          </StatusBadge>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
