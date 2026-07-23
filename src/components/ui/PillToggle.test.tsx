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

  it('grows the track for the md size without changing the switch role', () => {
    render(<PillToggle on onToggle={() => {}} label="Floating toolbar" size="md" />);
    const toggle = screen.getByRole('switch', { name: 'Floating toolbar' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle.className).toContain('h-6');
    expect(toggle.className).toContain('w-11');
  });
});
