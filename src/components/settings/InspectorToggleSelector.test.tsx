import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders as render, screen } from '@/test/test-utils';
import { InspectorToggleSelector } from './InspectorToggleSelector';

describe('InspectorToggleSelector', () => {
  it('marks the active toggle as pressed', () => {
    render(
      <InspectorToggleSelector
        value="off"
        defaultOn
        onChange={vi.fn()}
        ariaLabel="Status"
      />,
    );
    expect(screen.getByTestId('inspector-toggle-off')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('inspector-toggle-on')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('shows the resolved global default on the inherit chip', () => {
    render(
      <InspectorToggleSelector
        value="inherit"
        defaultOn
        onChange={vi.fn()}
        ariaLabel="Status"
      />,
    );
    expect(screen.getByTestId('inspector-toggle-inherit')).toHaveTextContent(
      /default.*on/i,
    );
  });

  it('explains on hover that the default inherits from universal settings', async () => {
    render(
      <InspectorToggleSelector
        value="inherit"
        defaultOn
        onChange={vi.fn()}
        ariaLabel="Status"
      />,
    );
    await userEvent.hover(screen.getByTestId('inspector-toggle-inherit'));
    const tip = await screen.findByTestId('inspector-toggle-inherit-tooltip');
    expect(tip).toHaveTextContent(/inherited from universal settings/i);
  });

  it('emits the chosen value', async () => {
    const onChange = vi.fn();
    render(
      <InspectorToggleSelector
        value="inherit"
        defaultOn={false}
        onChange={onChange}
        ariaLabel="Status"
      />,
    );
    await userEvent.click(screen.getByTestId('inspector-toggle-off'));
    expect(onChange).toHaveBeenCalledWith('off');
  });

  it('omits the inherit chip when includeInherit is false (global scope)', () => {
    render(
      <InspectorToggleSelector
        value="on"
        includeInherit={false}
        onChange={vi.fn()}
        ariaLabel="Status"
      />,
    );
    expect(screen.queryByTestId('inspector-toggle-inherit')).toBeNull();
    expect(screen.getByTestId('inspector-toggle-on')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('inspector-toggle-off')).toBeInTheDocument();
  });
});
