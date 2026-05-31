import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { ChipGroup } from './ChipGroup';

describe('ChipGroup', () => {
  it('renders options and marks the active one', () => {
    render(
      <ChipGroup options={['S', 'M', 'L']} active={1} label="Reading width" />,
    );
    const group = screen.getByRole('group', { name: 'Reading width' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'S' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('fires onChange with the selected index', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipGroup
        options={['Light', 'Dark']}
        active={0}
        onChange={onChange}
        label="Theme"
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  describe('value mode', () => {
    const options = [
      { label: 'Off', value: 0 },
      { label: '5 min', value: 5 },
      { label: '10 min', value: 10 },
    ];

    it('marks the chip whose value matches', () => {
      render(<ChipGroup options={options} value={5} label="Interval" />);
      expect(screen.getByRole('button', { name: '5 min' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: 'Off' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('fires onChange with the selected value, not its index', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<ChipGroup options={options} value={0} onChange={onChange} />);
      await user.click(screen.getByRole('button', { name: '10 min' }));
      expect(onChange).toHaveBeenCalledWith(10);
    });
  });

  describe('snapshot', () => {
    it('should match the snapshot across index and value modes', () => {
      const { container } = render(
        <div>
          <ChipGroup options={['S', 'M', 'L']} active={1} label="Width" />
          <ChipGroup
            options={[
              { label: 'Off', value: 0 },
              { label: '5 min', value: 5 },
            ]}
            value={5}
            label="Interval"
          />
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
