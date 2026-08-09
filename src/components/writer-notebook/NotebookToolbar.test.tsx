import { fireEvent, render, screen } from '@/test/test-utils';
import { NotebookToolbar } from './NotebookToolbar';

describe('NotebookToolbar', () => {
  it('keeps camera capture and multi-photo picking as separate inputs', () => {
    render(<NotebookToolbar onFiles={vi.fn()} disabled={false} />);
    expect(screen.getByTestId('notebook-choose-photos-input')).toHaveAttribute('multiple');
    expect(screen.getByTestId('notebook-take-photo-input')).toHaveAttribute('capture', 'environment');
    expect(screen.getByTestId('notebook-take-photo-input')).not.toHaveAttribute('multiple');
  });

  it('preserves picker order when handing files to the importer', () => {
    const onFiles = vi.fn();
    render(<NotebookToolbar onFiles={onFiles} disabled={false} />);
    const first = new File(['a'], 'page-a.jpg', { type: 'image/jpeg' });
    const second = new File(['b'], 'page-b.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('notebook-choose-photos-input'), {
      target: { files: [first, second] },
    });
    expect(onFiles).toHaveBeenCalledWith([first, second]);
  });

  it('focuses the choose-photos action when the empty state requests recovery focus', () => {
    render(<NotebookToolbar onFiles={vi.fn()} disabled={false} focusChoose />);
    expect(screen.getByRole('button', { name: 'Choose photos' })).toHaveFocus();
  });
});
