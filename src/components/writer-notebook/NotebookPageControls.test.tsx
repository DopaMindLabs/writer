import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { NotebookPageControls } from './NotebookPageControls';

describe('NotebookPageControls', () => {
  it('shows page position and invokes previous/next navigation', async () => {
    const user = userEvent.setup();
    const onPrevious = vi.fn();
    const onNext = vi.fn();
    render(
      <NotebookPageControls
        pageNumber={2}
        totalPages={3}
        onPrevious={onPrevious}
        onNext={onNext}
      />,
    );
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('disables navigation at the ends', () => {
    render(
      <NotebookPageControls pageNumber={1} totalPages={1} onPrevious={vi.fn()} onNext={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
