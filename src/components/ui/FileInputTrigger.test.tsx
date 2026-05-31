import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { FileInputTrigger } from './FileInputTrigger';

const renderTrigger = (props: Partial<Parameters<typeof FileInputTrigger>[0]> = {}) => {
  const onPick = props.onPick ?? vi.fn();
  render(
    <FileInputTrigger
      accept="image/png"
      multiple
      onPick={onPick}
      data-testid="trigger-input"
      {...props}
    >
      {(open) => (
        <button type="button" onClick={open}>
          Upload
        </button>
      )}
    </FileInputTrigger>,
  );
  return { onPick };
};

const pngFile = (name: string) =>
  new File(['x'], name, { type: 'image/png' });

describe('FileInputTrigger', () => {
  it('renders a hidden file input with the accept attribute', () => {
    renderTrigger();
    const input = screen.getByTestId('trigger-input');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/png');
    expect(input).toHaveClass('hidden');
  });

  it('calls onPick with the chosen files', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderTrigger({ onPick });
    const input = screen.getByTestId('trigger-input');
    await user.upload(input, [pngFile('a.png'), pngFile('b.png')]);
    expect(onPick).toHaveBeenCalledOnce();
    const files = onPick.mock.calls[0]?.[0] as File[];
    expect(files.map((f) => f.name)).toEqual(['a.png', 'b.png']);
  });

  it('does not call onPick when no files are chosen', async () => {
    const onPick = vi.fn();
    renderTrigger({ onPick });
    const input = screen.getByTestId('trigger-input') as HTMLInputElement;
    // Fire a change with an empty file list.
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('disables the input when disabled', () => {
    renderTrigger({ disabled: true });
    expect(screen.getByTestId('trigger-input')).toBeDisabled();
  });
});
