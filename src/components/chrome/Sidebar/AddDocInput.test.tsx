import { createRef, type KeyboardEvent } from 'react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { AddDocInput } from './AddDocInput';

const setup = (over: { value?: string; indented?: boolean } = {}) => {
  const onChange = vi.fn<(value: string) => void>();
  const onKeyDown = vi.fn<(e: KeyboardEvent<HTMLInputElement>) => void>();
  const onBlur = vi.fn<() => void>();
  renderWithProviders(
    <AddDocInput
      ref={createRef<HTMLInputElement>()}
      sectionId="sec1"
      value={over.value ?? ''}
      indented={over.indented}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />,
  );
  return { onChange, onKeyDown, onBlur };
};

describe('AddDocInput', () => {
  it('renders a labelled text field with the doc-name placeholder', () => {
    setup();
    const input = screen.getByTestId('sidebar-section-sec1-add-input');
    expect(input).toHaveAttribute('placeholder', 'Doc name (Enter to create)');
    expect(input).toHaveAccessibleName('New document name');
  });

  it('reflects the controlled value', () => {
    setup({ value: 'Chapter One' });
    expect(
      screen.getByTestId('sidebar-section-sec1-add-input'),
    ).toHaveValue('Chapter One');
  });

  it('calls onChange as the user types', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();
    await user.type(screen.getByTestId('sidebar-section-sec1-add-input'), 'H');
    expect(onChange).toHaveBeenCalledWith('H');
  });

  it('forwards key presses to onKeyDown', async () => {
    const user = userEvent.setup();
    const { onKeyDown } = setup();
    await user.type(
      screen.getByTestId('sidebar-section-sec1-add-input'),
      '{Enter}',
    );
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' }),
    );
  });

  it('calls onBlur when focus leaves the field', async () => {
    const user = userEvent.setup();
    const { onBlur } = setup();
    await user.click(screen.getByTestId('sidebar-section-sec1-add-input'));
    await user.tab();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
