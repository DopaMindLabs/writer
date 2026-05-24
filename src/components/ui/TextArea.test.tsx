import { render } from '@/test/test-utils';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  describe('rendering', () => {
    it('should render with the given placeholder', () => {
      const { getByTestId } = render(
        <TextArea data-testid="ta-rest" placeholder="leave a note…" />,
      );
      expect(getByTestId('ta-rest')).toHaveAttribute(
        'placeholder',
        'leave a note…',
      );
    });

    it('should render with a default value', () => {
      const { getByTestId } = render(
        <TextArea data-testid="ta-filled" defaultValue="first line" />,
      );
      expect(getByTestId('ta-filled')).toHaveValue('first line');
    });

    it('should default to 4 rows', () => {
      const { getByTestId } = render(<TextArea data-testid="ta-rows" />);
      expect((getByTestId('ta-rows') as HTMLTextAreaElement).rows).toBe(4);
    });

    it('should honour an explicit rows prop', () => {
      const { getByTestId } = render(
        <TextArea data-testid="ta-rows-8" rows={8} />,
      );
      expect((getByTestId('ta-rows-8') as HTMLTextAreaElement).rows).toBe(8);
    });
  });

  describe('variants', () => {
    it('should apply rest tone classes by default', () => {
      const { getByTestId } = render(<TextArea data-testid="ta-rest" />);
      const el = getByTestId('ta-rest');
      expect(el.className).toContain('border-rule');
      expect(el.className).toContain('focus:border-ink');
    });

    it('should apply disabled tone classes when disabled', () => {
      const { getByTestId } = render(
        <TextArea data-testid="ta-disabled" disabled />,
      );
      const el = getByTestId('ta-disabled');
      expect(el).toBeDisabled();
      expect(el.className).toContain('bg-paper-2');
      expect(el.className).toContain('text-ink-4');
    });

    it('should apply error tone classes when error is set', () => {
      const { getByTestId } = render(
        <TextArea data-testid="ta-error" defaultValue="bad" error />,
      );
      const el = getByTestId('ta-error');
      expect(el.className).toContain('border-ink');
      expect(el).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <TextArea data-testid="ta-snap-rest" placeholder="rest" />
          <TextArea data-testid="ta-snap-filled" defaultValue="filled" />
          <TextArea data-testid="ta-snap-disabled" disabled />
          <TextArea data-testid="ta-snap-error" defaultValue="bad" error />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
