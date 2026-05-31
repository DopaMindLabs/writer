import { fireEvent, render } from '@/test/test-utils';
import { useState } from 'react';
import { RadioRow, type RadioOption } from './RadioRow';

const THEMES: RadioOption[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
];

describe('RadioRow', () => {
  describe('rendering', () => {
    it('should render a radiogroup', () => {
      const { getByTestId } = render(
        <RadioRow
          data-testid="rr-group"
          name="theme"
          options={THEMES}
          value="light"
          onChange={() => {}}
        />,
      );
      expect(getByTestId('rr-group')).toHaveAttribute('role', 'radiogroup');
    });

    it('should render one input per option with correct labels', () => {
      const { getByTestId, getByText } = render(
        <RadioRow
          data-testid="rr-opts"
          name="theme"
          options={THEMES}
          value="light"
          onChange={() => {}}
        />,
      );
      expect(getByTestId('rr-opts-light')).toBeInTheDocument();
      expect(getByTestId('rr-opts-dark')).toBeInTheDocument();
      expect(getByTestId('rr-opts-system')).toBeInTheDocument();
      expect(getByText('Light')).toBeInTheDocument();
      expect(getByText('Match system')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should mark only the active option as checked', () => {
      const { getByTestId } = render(
        <RadioRow
          data-testid="rr-active"
          name="theme"
          options={THEMES}
          value="dark"
          onChange={() => {}}
        />,
      );
      expect((getByTestId('rr-active-light') as HTMLInputElement).checked).toBe(
        false,
      );
      expect((getByTestId('rr-active-dark') as HTMLInputElement).checked).toBe(
        true,
      );
      expect(
        (getByTestId('rr-active-system') as HTMLInputElement).checked,
      ).toBe(false);
    });

    it('should disable every input when disabled', () => {
      const { getByTestId } = render(
        <RadioRow
          data-testid="rr-dis"
          name="theme"
          options={THEMES}
          value="light"
          onChange={() => {}}
          disabled
        />,
      );
      expect(getByTestId('rr-dis')).toHaveAttribute('aria-disabled', 'true');
      expect(getByTestId('rr-dis-light')).toBeDisabled();
      expect(getByTestId('rr-dis-dark')).toBeDisabled();
      expect(getByTestId('rr-dis-system')).toBeDisabled();
    });
  });

  describe('behaviour', () => {
    it('should call onChange with the new value when a different option is picked', () => {
      const onChange = vi.fn();
      const { getByTestId } = render(
        <RadioRow
          data-testid="rr-cb"
          name="theme"
          options={THEMES}
          value="light"
          onChange={onChange}
        />,
      );
      fireEvent.click(getByTestId('rr-cb-dark'));
      expect(onChange).toHaveBeenCalledWith('dark');
    });

    it('should update the visible selection when integrated as controlled', () => {
      const Wrapper = () => {
        const [v, setV] = useState('light');
        return (
          <RadioRow
            data-testid="rr-int"
            name="theme"
            options={THEMES}
            value={v}
            onChange={setV}
          />
        );
      };
      const { getByTestId } = render(<Wrapper />);
      expect((getByTestId('rr-int-light') as HTMLInputElement).checked).toBe(
        true,
      );
      fireEvent.click(getByTestId('rr-int-system'));
      expect((getByTestId('rr-int-system') as HTMLInputElement).checked).toBe(
        true,
      );
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <RadioRow
            data-testid="rr-snap-rest"
            name="theme1"
            options={THEMES}
            value="light"
            onChange={() => {}}
          />
          <RadioRow
            data-testid="rr-snap-active-dark"
            name="theme2"
            options={THEMES}
            value="dark"
            onChange={() => {}}
          />
          <RadioRow
            data-testid="rr-snap-disabled"
            name="theme3"
            options={THEMES}
            value="light"
            onChange={() => {}}
            disabled
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
