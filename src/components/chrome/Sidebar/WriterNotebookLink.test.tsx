import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import { db } from '@/db/db';
import type { WriterNotebook } from '@/db/schema';
import { sampleMetadata } from '@/test/fixtures';
import { WriterNotebookLink } from './WriterNotebookLink';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const notebook: WriterNotebook = {
  ...sampleMetadata('s1'),
  id: 'n1',
  spaceId: 's1',
  title: 'Research notebook',
  createdAt: 1,
  updatedAt: 1,
};

describe('WriterNotebookLink', () => {
  beforeEach(() => {
    navigateSpy.mockClear();
  });

  it('opens the notebook and exposes its page count accessibly', () => {
    renderWithProviders(
      <WriterNotebookLink notebook={notebook} pageCount={3} active={false} />,
      { initialEntries: ['/s/s1'] },
    );
    expect(screen.getByTestId('sidebar-writer-notebook-n1')).toHaveAttribute(
      'href',
      '/s/s1/notebooks/n1',
    );
    expect(screen.getByLabelText('3 pages')).toBeInTheDocument();
  });

  it('renames from the row menu', async () => {
    await db.writerNotebooks.put(notebook);
    const user = userEvent.setup();
    renderWithProviders(
      <WriterNotebookLink notebook={notebook} pageCount={0} active={false} />,
      { initialEntries: ['/s/s1'] },
    );
    await user.click(screen.getByRole('button', { name: 'Options for Research notebook' }));
    await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByRole('textbox', { name: 'Rename Research notebook' });
    await user.clear(input);
    await user.type(input, 'Lab notebook{enter}');
    await waitFor(async () => { expect((await db.writerNotebooks.get('n1'))?.title).toBe('Lab notebook'); });
  });

  it('confirms deletion and leaves an active notebook route', async () => {
    await db.writerNotebooks.put(notebook);
    const user = userEvent.setup();
    renderWithProviders(
      <WriterNotebookLink notebook={notebook} pageCount={0} active />,
      { initialEntries: ['/s/s1/notebooks/n1'] },
    );

    await user.click(screen.getByRole('button', { name: 'Options for Research notebook' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.getByRole('dialog', { name: 'Delete notebook' })).toHaveTextContent(
      '“Research notebook” and all its pages will be permanently deleted.',
    );
    await user.click(screen.getByRole('button', { name: 'Delete notebook' }));

    await waitFor(async () => {
      expect(await db.writerNotebooks.get(notebook.id)).toBeUndefined();
    });
    expect(navigateSpy).toHaveBeenCalledWith('/s/s1');
  });
});
