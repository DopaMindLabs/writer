import { createRef, type KeyboardEvent } from 'react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import type { AddSectionController } from './Sidebar.types';
import { AddSectionRow } from './AddSectionRow';

const setup = (over: Partial<AddSectionController> = {}) => {
  const onStart = vi.fn<() => void>();
  const onChange = vi.fn<(value: string) => void>();
  const onKeyDown = vi.fn<(e: KeyboardEvent<HTMLInputElement>) => void>();
  const onBlur = vi.fn<() => void>();
  const add: AddSectionController = {
    adding: false,
    value: '',
    inputRef: createRef<HTMLInputElement>(),
    onStart,
    onChange,
    onKeyDown,
    onBlur,
    ...over,
  };
  renderWithProviders(<AddSectionRow add={add} />);
  return { onStart, onChange, onKeyDown, onBlur };
};

describe('AddSectionRow', () => {
  describe('when collapsed', () => {
    it('renders the add-section trigger with an accessible name', () => {
      setup();
      const trigger = screen.getByTestId('sidebar-add-section-trigger');
      expect(trigger).toHaveAccessibleName('Add section to this space');
      expect(trigger).toHaveTextContent('Add section');
    });

    it('starts adding when the trigger is clicked', async () => {
      const user = userEvent.setup();
      const { onStart } = setup();
      await user.click(screen.getByTestId('sidebar-add-section-trigger'));
      expect(onStart).toHaveBeenCalledOnce();
    });

    it('does not render the input', () => {
      setup();
      expect(
        screen.queryByTestId('sidebar-add-section-input'),
      ).not.toBeInTheDocument();
    });
  });

  describe('when adding', () => {
    it('renders a labelled input seeded with the section-name value', () => {
      setup({ adding: true, value: 'Appendix' });
      const input = screen.getByTestId('sidebar-add-section-input');
      expect(input).toHaveAttribute(
        'placeholder',
        'Section name (Enter to create)',
      );
      expect(input).toHaveAccessibleName('Add section to this space');
      expect(input).toHaveValue('Appendix');
    });

    it('calls onChange as the user types', async () => {
      const user = userEvent.setup();
      const { onChange } = setup({ adding: true });
      await user.type(screen.getByTestId('sidebar-add-section-input'), 'A');
      expect(onChange).toHaveBeenCalledWith('A');
    });

    it('forwards key presses and blur to the controller', async () => {
      const user = userEvent.setup();
      const { onKeyDown, onBlur } = setup({ adding: true });
      const input = screen.getByTestId('sidebar-add-section-input');
      await user.type(input, '{Escape}');
      expect(onKeyDown).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'Escape' }),
      );
      await user.tab();
      expect(onBlur).toHaveBeenCalledOnce();
    });

    it('does not render the collapsed trigger', () => {
      setup({ adding: true });
      expect(
        screen.queryByTestId('sidebar-add-section-trigger'),
      ).not.toBeInTheDocument();
    });
  });
});
