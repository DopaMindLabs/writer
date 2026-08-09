import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/test-utils';
import { NotebookPageMenu } from './NotebookPageMenu';

const setup = () => {
  const actions = {
    onRotate: vi.fn(),
    onMoveEarlier: vi.fn(),
    onMoveLater: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<NotebookPageMenu canMoveEarlier canMoveLater {...actions} />);
  return actions;
};

describe('NotebookPageMenu', () => {
  it('exposes non-drag reorder and rotation actions', async () => {
    const user = userEvent.setup();
    const actions = setup();
    await user.click(screen.getByRole('button', { name: 'Page actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Move earlier' }));
    expect(actions.onMoveEarlier).toHaveBeenCalledOnce();
  });

  it('confirms before deleting a page', async () => {
    const user = userEvent.setup();
    const actions = setup();
    await user.click(screen.getByRole('button', { name: 'Page actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete page' }));
    expect(screen.getByRole('dialog', { name: 'Delete page?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete page' }));
    expect(actions.onDelete).toHaveBeenCalledOnce();
  });
});
