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
    it('should apply rest tone classes by default', () => {
      const { getByTestId } = render(<TextField data-testid="tf-rest" />);
      const el = getByTestId('tf-rest');
      expect(el.className).toContain('border-rule');
      expect(el.className).toContain('focus:border-ink');
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
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
