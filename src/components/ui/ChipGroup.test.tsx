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
});
