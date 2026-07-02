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
});
