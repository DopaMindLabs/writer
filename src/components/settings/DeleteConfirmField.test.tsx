import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '@/test/test-utils';
import { DeleteConfirmField } from './DeleteConfirmField';

describe('DeleteConfirmField', () => {
  it('renders the label and reports typed input', () => {
    const onChange = vi.fn();
    render(
      <DeleteConfirmField
        label="Type Novel to confirm"
        value=""
        onChange={onChange}
        testId="confirm"
      />,
    );
    expect(screen.getByText('Type Novel to confirm')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('confirm'), {
      target: { value: 'Novel' },
    });
    expect(onChange).toHaveBeenCalledWith('Novel');
  });
});
