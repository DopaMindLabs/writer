import { fireEvent, render } from '@/test/test-utils';
import { useState } from 'react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  describe('rendering', () => {
    it('should render with the given label text', () => {
      const { getByText } = render(
        <Checkbox data-testid="cb-lbl" label="Send updates" />,
      );
      expect(getByText('Send updates')).toBeInTheDocument();
    });

    it('should render without a label when none is provided', () => {
      const { queryByText, getByTestId } = render(
        <Checkbox data-testid="cb-nolbl" />,
      );
      expect(getByTestId('cb-nolbl')).toBeInTheDocument();
      expect(queryByText(/.+/)).toBeNull();
    });

    it('should associate the label with the input via htmlFor', () => {
      const { getByLabelText } = render(
        <Checkbox data-testid="cb-assoc" label="Sync" />,
      );
      expect(getByLabelText('Sync')).toBe(
        document.querySelector('[data-testid="cb-assoc"]'),
      );
    });

    it('should accept and use a custom id', () => {
      const { getByTestId } = render(
        <Checkbox data-testid="cb-id" id="custom-id" label="Notify" />,
      );
      expect(getByTestId('cb-id')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('variants', () => {
    it('should be unchecked by default when uncontrolled', () => {
      const { getByTestId } = render(<Checkbox data-testid="cb-unc" />);
      expect((getByTestId('cb-unc') as HTMLInputElement).checked).toBe(false);
    });

    it('should reflect defaultChecked=true', () => {
      const { getByTestId } = render(
        <Checkbox data-testid="cb-def" defaultChecked />,
      );
      expect((getByTestId('cb-def') as HTMLInputElement).checked).toBe(true);
    });

    it('should reflect a controlled checked=true value', () => {
      const { getByTestId } = render(
        <Checkbox data-testid="cb-ctl" checked onChange={() => {}} />,
      );
      expect((getByTestId('cb-ctl') as HTMLInputElement).checked).toBe(true);
    });

    it('should disable the input when disabled', () => {
      const { getByTestId } = render(<Checkbox data-testid="cb-dis" disabled />);
      expect(getByTestId('cb-dis')).toBeDisabled();
    });
  });

  describe('behaviour', () => {
    it('should toggle when clicked and call onChange', () => {
      const Wrapper = () => {
        const [v, setV] = useState(false);
        return (
          <Checkbox
            data-testid="cb-toggle"
            checked={v}
            onChange={(e) => { setV(e.target.checked); }}
            label="t"
          />
        );
      };
      const { getByTestId } = render(<Wrapper />);
      const el = getByTestId('cb-toggle') as HTMLInputElement;
      expect(el.checked).toBe(false);
      fireEvent.click(el);
      expect(el.checked).toBe(true);
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <Checkbox data-testid="cb-snap-rest" label="rest" />
          <Checkbox data-testid="cb-snap-checked" label="checked" defaultChecked />
          <Checkbox data-testid="cb-snap-disabled" label="disabled" disabled />
          <Checkbox
            data-testid="cb-snap-checked-disabled"
            label="checked + disabled"
            defaultChecked
            disabled
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
