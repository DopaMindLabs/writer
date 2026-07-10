import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '@/test/test-utils';
import { DateField } from './DateField';

const EPOCH = new Date(2026, 2, 14).getTime();

describe('DateField', () => {
  it('renders a date input reflecting the epoch value', () => {
    render(<DateField aria-label="Due date" value={EPOCH} onChange={vi.fn()} />);
    const input = screen.getByLabelText('Due date');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveValue('2026-03-14');
  });

  it('emits epoch ms when a date is picked', () => {
    const onChange = vi.fn();
    render(<DateField aria-label="Due date" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-03-14' },
    });
    expect(onChange).toHaveBeenCalledWith(EPOCH);
  });

  it('emits undefined when cleared', () => {
    const onChange = vi.fn();
    render(<DateField aria-label="Due date" value={EPOCH} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('forwards min as a date string', () => {
    render(<DateField aria-label="Due date" min={EPOCH} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Due date')).toHaveAttribute('min', '2026-03-14');
  });

  it('supports the disabled state', () => {
    render(<DateField aria-label="Due date" disabled onChange={vi.fn()} />);
    expect(screen.getByLabelText('Due date')).toBeDisabled();
  });
});
