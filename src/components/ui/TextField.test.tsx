import { render } from '@/test/test-utils';
import { TextField } from './TextField';

describe('TextField', () => {
  describe('rendering', () => {
    it('should render with the given placeholder', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-rest" placeholder="title…" />,
      );
      expect(getByTestId('tf-rest')).toHaveAttribute('placeholder', 'title…');
    });

    it('should render with a default value when uncontrolled', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-filled" defaultValue="On reading slowly" />,
      );
      expect(getByTestId('tf-filled')).toHaveValue('On reading slowly');
    });

    it('should render type=text by default', () => {
      const { getByTestId } = render(<TextField data-testid="tf-type" />);
      expect(getByTestId('tf-type')).toHaveAttribute('type', 'text');
    });

    it('should accept and render an explicit type prop', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-email" type="email" />,
      );
      expect(getByTestId('tf-email')).toHaveAttribute('type', 'email');
    });
  });

  describe('variants', () => {
    it('should default to the baseline variant with rest tone', () => {
      const { getByTestId } = render(<TextField data-testid="tf-rest" />);
      const el = getByTestId('tf-rest');
      expect(el.className).toContain('border-b');
      expect(el.className).toContain('border-rule');
      expect(el.className).toContain('focus:border-ink');
    });

    it('should apply the bare variant classes (no border, no padding)', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-bare" variant="bare" />,
      );
      const el = getByTestId('tf-bare');
      expect(el.className).toContain('border-0');
      expect(el.className).toContain('p-0');
      expect(el.className).not.toContain('border-b');
    });

    it('should not add a focus border in the bare variant', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-bare-focus" variant="bare" />,
      );
      expect(getByTestId('tf-bare-focus').className).not.toContain(
        'focus:border-ink',
      );
    });

    it('should still aria-invalid in the bare variant when error is set', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-bare-error" variant="bare" error />,
      );
      expect(getByTestId('tf-bare-error')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('should apply the disabled tone classes when disabled', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-disabled" disabled />,
      );
      const el = getByTestId('tf-disabled');
      expect(el).toBeDisabled();
      expect(el.className).toContain('bg-paper-2');
      expect(el.className).toContain('text-ink-4');
    });

    it('should apply the error tone classes when error is set', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-error" defaultValue="bad" error />,
      );
      const el = getByTestId('tf-error');
      expect(el.className).toContain('border-ink');
      expect(el).toHaveAttribute('aria-invalid', 'true');
    });

    it('should prefer disabled tone over error when both are set', () => {
      const { getByTestId } = render(
        <TextField data-testid="tf-both" defaultValue="x" disabled error />,
      );
      const el = getByTestId('tf-both');
      expect(el.className).toContain('bg-paper-2');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <TextField data-testid="tf-snap-rest" placeholder="rest" />
          <TextField data-testid="tf-snap-filled" defaultValue="filled" />
          <TextField data-testid="tf-snap-disabled" disabled placeholder="off" />
          <TextField data-testid="tf-snap-error" defaultValue="bad" error />
          <TextField
            data-testid="tf-snap-bare"
            variant="bare"
            defaultValue="bare"
          />
          <TextField
            data-testid="tf-snap-bare-disabled"
            variant="bare"
            disabled
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
