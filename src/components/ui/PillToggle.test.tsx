import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { PillToggle } from './PillToggle';

describe('PillToggle', () => {
  it('renders off and on states', () => {
    const { container } = render(
      <div>
        <PillToggle on={false} onToggle={() => {}} label="Focus mode" />
        <PillToggle on onToggle={() => {}} label="Floating toolbar" />
      </div>,
    );
    expect(container).toMatchSnapshot();
  });

  it('fires onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<PillToggle on={false} onToggle={onToggle} label="Focus" />);
    await user.click(screen.getByRole('switch', { name: 'Focus' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
