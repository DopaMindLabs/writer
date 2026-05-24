import { fireEvent, render } from '@/test/test-utils';
import { Select, type SelectOption } from './Select';

const THEMES: SelectOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

describe('Select', () => {
  describe('rendering', () => {
    it('should render every provided option', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-opts" options={THEMES} />,
      );
      const el = getByTestId('sel-opts') as HTMLSelectElement;
      expect(el.options).toHaveLength(3);
      expect(el.options[0].textContent).toBe('Light');
      expect(el.options[2].textContent).toBe('Match system');
    });

    it('should render the selected value when controlled', () => {
      const { getByTestId } = render(
        <Select
          data-testid="sel-val"
          options={THEMES}
          value="dark"
          onChange={() => {}}
        />,
      );
      expect((getByTestId('sel-val') as HTMLSelectElement).value).toBe('dark');
    });

    it('should render with a default value when uncontrolled', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-def" options={THEMES} defaultValue="system" />,
      );
      expect((getByTestId('sel-def') as HTMLSelectElement).value).toBe(
        'system',
      );
    });
  });

  describe('variants', () => {
    it('should be enabled and not aria-invalid by default', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-rest" options={THEMES} />,
      );
      const el = getByTestId('sel-rest');
      expect(el).not.toBeDisabled();
      expect(el).not.toHaveAttribute('aria-invalid');
    });

    it('should default to the baseline variant', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-baseline" options={THEMES} />,
      );
      expect(getByTestId('sel-baseline').className).toContain('font-sans');
    });

    it('should apply the bare variant classes (no padding, no font preset)', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-bare" variant="bare" options={THEMES} />,
      );
      const el = getByTestId('sel-bare');
      expect(el.className).toContain('p-0');
      expect(el.className).not.toContain('font-sans');
    });

    it('should be disabled and apply disabled tone classes when disabled', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-dis" options={THEMES} disabled />,
      );
      const el = getByTestId('sel-dis');
      expect(el).toBeDisabled();
      expect(el.className).toContain('text-ink-4');
    });

    it('should be aria-invalid when error is set', () => {
      const { getByTestId } = render(
        <Select data-testid="sel-err" options={THEMES} error />,
      );
      expect(getByTestId('sel-err')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('behaviour', () => {
    it('should call onChange when the user picks a different option', () => {
      const onChange = vi.fn();
      const { getByTestId } = render(
        <Select
          data-testid="sel-change"
          options={THEMES}
          value="light"
          onChange={onChange}
        />,
      );
      fireEvent.change(getByTestId('sel-change'), {
        target: { value: 'dark' },
      });
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <Select data-testid="sel-snap-rest" options={THEMES} />
          <Select
            data-testid="sel-snap-filled"
            options={THEMES}
            defaultValue="dark"
          />
          <Select data-testid="sel-snap-disabled" options={THEMES} disabled />
          <Select data-testid="sel-snap-error" options={THEMES} error />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
