import { fireEvent, render } from '@/test/test-utils';
import { useState } from 'react';
import { SearchField } from './SearchField';

describe('SearchField', () => {
  describe('rendering', () => {
    it('should render with a default placeholder', () => {
      const { getByTestId } = render(<SearchField data-testid="sf-default" />);
      expect(getByTestId('sf-default')).toHaveAttribute(
        'placeholder',
        'search…',
      );
    });

    it('should render with a custom placeholder', () => {
      const { getByTestId } = render(
        <SearchField data-testid="sf-custom" placeholder="find a citation" />,
      );
      expect(getByTestId('sf-custom')).toHaveAttribute(
        'placeholder',
        'find a citation',
      );
    });

    it('should render with type=search', () => {
      const { getByTestId } = render(<SearchField data-testid="sf-type" />);
      expect(getByTestId('sf-type')).toHaveAttribute('type', 'search');
    });
  });

  describe('clear button visibility', () => {
    it('should hide the clear button when the value is empty', () => {
      const { queryByTestId } = render(
        <SearchField data-testid="sf-empty" value="" onChange={() => {}} />,
      );
      expect(queryByTestId('sf-empty-clear')).toBeNull();
    });

    it('should show the clear button when the controlled value is non-empty', () => {
      const { getByTestId } = render(
        <SearchField
          data-testid="sf-filled"
          value="bell-keeper"
          onChange={() => {}}
        />,
      );
      expect(getByTestId('sf-filled-clear')).toBeInTheDocument();
    });

    it('should show the clear button when the uncontrolled default value is non-empty', () => {
      const { getByTestId } = render(
        <SearchField data-testid="sf-def" defaultValue="bell-keeper" />,
      );
      expect(getByTestId('sf-def-clear')).toBeInTheDocument();
    });

    it('should hide the clear button when disabled even with a value', () => {
      const { queryByTestId } = render(
        <SearchField
          data-testid="sf-dis"
          defaultValue="bell-keeper"
          disabled
        />,
      );
      expect(queryByTestId('sf-dis-clear')).toBeNull();
    });

    it('should show the clear button after typing into an initially empty uncontrolled field', () => {
      const { getByTestId, queryByTestId } = render(
        <SearchField data-testid="sf-uctl-type" />,
      );
      expect(queryByTestId('sf-uctl-type-clear')).toBeNull();
      fireEvent.change(getByTestId('sf-uctl-type'), {
        target: { value: 'a' },
      });
      expect(getByTestId('sf-uctl-type-clear')).toBeInTheDocument();
    });

    it('should hide the clear button after the user clears an uncontrolled field by typing', () => {
      const { getByTestId, queryByTestId } = render(
        <SearchField data-testid="sf-uctl-erase" defaultValue="seed" />,
      );
      expect(getByTestId('sf-uctl-erase-clear')).toBeInTheDocument();
      fireEvent.change(getByTestId('sf-uctl-erase'), {
        target: { value: '' },
      });
      expect(queryByTestId('sf-uctl-erase-clear')).toBeNull();
    });
  });

  describe('clear behaviour', () => {
    it('should call onClear and reset the value when the clear button is clicked', () => {
      const Wrapper = () => {
        const [v, setV] = useState('seed');
        return (
          <SearchField
            data-testid="sf-clear"
            value={v}
            onChange={(e) => { setV(e.target.value); }}
            onClear={() => { setV(''); }}
          />
        );
      };
      const { getByTestId, queryByTestId } = render(<Wrapper />);
      expect(getByTestId('sf-clear')).toHaveValue('seed');
      fireEvent.click(getByTestId('sf-clear-clear'));
      expect(getByTestId('sf-clear')).toHaveValue('');
      expect(queryByTestId('sf-clear-clear')).toBeNull();
    });

    it('should hide the clear button after clicking clear on an uncontrolled field', () => {
      const onClear = vi.fn();
      const { getByTestId, queryByTestId } = render(
        <SearchField
          data-testid="sf-uctl-clear"
          defaultValue="seed"
          onClear={onClear}
        />,
      );
      expect(getByTestId('sf-uctl-clear')).toHaveValue('seed');
      fireEvent.click(getByTestId('sf-uctl-clear-clear'));
      expect(getByTestId('sf-uctl-clear')).toHaveValue('');
      expect(queryByTestId('sf-uctl-clear-clear')).toBeNull();
      expect(document.activeElement).toBe(getByTestId('sf-uctl-clear'));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should expose a custom clear aria-label', () => {
      const { getByLabelText } = render(
        <SearchField
          data-testid="sf-lbl"
          defaultValue="x"
          clearLabel="Reset filter"
        />,
      );
      expect(getByLabelText('Reset filter')).toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across all variants', () => {
      const { container } = render(
        <div>
          <SearchField data-testid="sf-snap-empty" />
          <SearchField data-testid="sf-snap-filled" defaultValue="seed" />
          <SearchField data-testid="sf-snap-disabled" disabled />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
