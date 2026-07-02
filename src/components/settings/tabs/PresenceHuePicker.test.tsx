import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { PresenceHuePicker } from './PresenceHuePicker';

describe('PresenceHuePicker', () => {
  it('renders a swatch per presence hue, labelled by name, marking the current one', () => {
    renderWithProviders(
      <PresenceHuePicker value="presence-1" onChange={() => {}} label="Presence colour" />,
    );
    for (const name of ['Terracotta', 'Slate blue', 'Moss', 'Plum', 'Ochre']) {
      expect(screen.getByRole('radio', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('radio', { name: 'Terracotta' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('reports the chosen hue key when a swatch is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <PresenceHuePicker value="presence-1" onChange={onChange} label="Presence colour" />,
    );
    await user.click(screen.getByRole('radio', { name: 'Moss' }));
    expect(onChange).toHaveBeenCalledWith('presence-3');
  });

  it('exposes the group as a single tab stop via the checked swatch', () => {
    renderWithProviders(
      <PresenceHuePicker value="presence-2" onChange={() => {}} label="Presence colour" />,
    );
    expect(screen.getByRole('radio', { name: 'Slate blue' })).toHaveAttribute('tabindex', '0');
    for (const name of ['Terracotta', 'Moss', 'Plum', 'Ochre']) {
      expect(screen.getByRole('radio', { name })).toHaveAttribute('tabindex', '-1');
    }
  });

  it('moves and checks the next hue with the arrow keys', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <PresenceHuePicker value="presence-1" onChange={onChange} label="Presence colour" />,
    );
    const first = screen.getByRole('radio', { name: 'Terracotta' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('presence-2');
    expect(screen.getByRole('radio', { name: 'Slate blue' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenLastCalledWith('presence-3');
  });

  it('wraps around and supports Home/End with the arrow keys', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <PresenceHuePicker value="presence-1" onChange={onChange} label="Presence colour" />,
    );
    const first = screen.getByRole('radio', { name: 'Terracotta' });
    first.focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('presence-5');
    expect(screen.getByRole('radio', { name: 'Ochre' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('presence-1');
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('presence-5');
  });
});
