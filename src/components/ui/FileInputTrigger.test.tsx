import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
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

  it('open() clicks the hidden input when not disabled', async () => {
    const user = userEvent.setup();
    render(
      <FileInputTrigger onPick={vi.fn()} data-testid="trigger-input">
        {(open) => (
          <button type="button" onClick={open}>
            Upload
          </button>
        )}
      </FileInputTrigger>,
    );
    const input = screen.getByTestId('trigger-input') as HTMLInputElement;
    const clickSpy = vi.fn();
    input.click = clickSpy;
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('open() is a no-op when disabled', async () => {
    const user = userEvent.setup();
    render(
      <FileInputTrigger disabled onPick={vi.fn()} data-testid="trigger-input">
        {(open) => (
          <button type="button" onClick={open}>
            Upload
          </button>
        )}
      </FileInputTrigger>,
    );
    const input = screen.getByTestId('trigger-input') as HTMLInputElement;
    const clickSpy = vi.fn();
    input.click = clickSpy;
    await user.click(screen.getByRole('button', { name: 'Upload' }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('treats a null file list as no selection', () => {
    const onPick = vi.fn();
    renderTrigger({ onPick });
    fireEvent.change(screen.getByTestId('trigger-input'), {
      target: { files: null },
    });
    expect(onPick).not.toHaveBeenCalled();
  });
});
