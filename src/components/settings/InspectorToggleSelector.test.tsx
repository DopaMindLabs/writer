import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
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
});
