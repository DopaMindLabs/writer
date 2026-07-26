import { createRef, type KeyboardEvent } from 'react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { AddController, AddingState } from './Sidebar.types';
import { MaybeAddInput } from './MaybeAddInput';

const setup = (
  over: { sectionId?: string; adding?: AddingState | null } = {},
) => {
  const onChange = vi.fn<(value: string) => void>();
  const onKeyDown = vi.fn<(e: KeyboardEvent<HTMLInputElement>) => void>();
  const onBlur = vi.fn<() => void>();
  const add: AddController = {
    adding: over.adding ?? null,
    inputRef: createRef<HTMLInputElement>(),
    onChange,
    onKeyDown,
    onBlur,
  };
  renderWithProviders(
    <MaybeAddInput sectionId={over.sectionId ?? 'sec1'} add={add} />,
  );
  return { onChange, onKeyDown, onBlur };
};

describe('MaybeAddInput', () => {
  it('renders nothing when nothing is being added', () => {
    setup({ adding: null });
    expect(
      screen.queryByTestId('sidebar-section-sec1-add-input'),
    ).not.toBeInTheDocument();
  });

  it('renders nothing when another section is being added to', () => {
    setup({ sectionId: 'sec1', adding: { sectionId: 'sec2', value: 'Notes' } });
    expect(
      screen.queryByTestId('sidebar-section-sec1-add-input'),
    ).not.toBeInTheDocument();
  });

  it('renders the add-doc input for the matching section', () => {
    setup({ sectionId: 'sec1', adding: { sectionId: 'sec1', value: 'Notes' } });
    const input = screen.getByTestId('sidebar-section-sec1-add-input');
    expect(input).toHaveValue('Notes');
    expect(input).toHaveAccessibleName('New document name');
  });

  it('wires the input events to the controller', async () => {
    const user = userEvent.setup();
    const { onChange, onKeyDown } = setup({
      sectionId: 'sec1',
      adding: { sectionId: 'sec1', value: '' },
    });
    const input = screen.getByTestId('sidebar-section-sec1-add-input');
    await user.type(input, 'N');
    expect(onChange).toHaveBeenCalledWith('N');
    await user.type(input, '{Enter}');
    expect(onKeyDown).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'Enter' }),
    );
  });
});
