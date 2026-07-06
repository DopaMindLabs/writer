import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectionStripNoteEditor } from './SelectionStripNoteEditor';

const base = {
  colorSwatchClassName: 'bg-hl-yellow',
  eyebrow: 'P.1 · HIGHLIGHT + NOTE',
  placeholder: 'Add a note…',
  cancelHint: 'ESC CANCELS',
  saveHint: '↵ SAVE',
};

describe('SelectionStripNoteEditor', () => {
  it('focuses the input on open and shows the eyebrow and hints', () => {
    render(<SelectionStripNoteEditor {...base} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('strip-note-input')).toHaveFocus();
    expect(screen.getByText('P.1 · HIGHLIGHT + NOTE')).toBeInTheDocument();
    expect(screen.getByText('ESC CANCELS')).toBeInTheDocument();
    expect(screen.getByText('↵ SAVE')).toBeInTheDocument();
  });

  it('saves on Enter and cancels on Escape', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(<SelectionStripNoteEditor {...base} onSave={onSave} onCancel={onCancel} />);
    const input = screen.getByTestId('strip-note-input');
    fireEvent.change(input, { target: { value: 'remember this' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledWith('remember this');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('prefills an existing note', () => {
    render(
      <SelectionStripNoteEditor
        {...base}
        initialValue="prior note"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('strip-note-input')).toHaveValue('prior note');
  });
});
