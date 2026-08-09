import { renderAtRoute, screen } from '@/test/test-utils';
import { db } from '@/db/db';
import { sampleMetadata, sampleSpace } from '@/test/fixtures';
import type { WriterNotebook } from '@/db/schema';
import { WriterNotebookScreen } from './WriterNotebook';

const notebook: WriterNotebook = {
  ...sampleMetadata('s1'),
  id: 'nb1',
  spaceId: 's1',
  title: 'Field notebook',
  createdAt: 1,
  updatedAt: 1,
};

describe('WriterNotebookScreen', () => {
  it('renders a space-scoped notebook and its photo actions', async () => {
    await db.spaces.put(sampleSpace);
    await db.writerNotebooks.put(notebook);
    renderAtRoute(<WriterNotebookScreen />, {
      path: '/s/:spaceId/notebooks/:notebookId',
      initialEntries: ['/s/s1/notebooks/nb1'],
    });
    expect(await screen.findByText('Field notebook')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose photos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeInTheDocument();
  });

  it('does not open a notebook from another space', async () => {
    await db.spaces.put(sampleSpace);
    await db.writerNotebooks.put({ ...notebook, spaceId: 's2' });
    const { queryByText } = renderAtRoute(<WriterNotebookScreen />, {
      path: '/s/:spaceId/notebooks/:notebookId',
      initialEntries: ['/s/s1/notebooks/nb1'],
    });
    expect(queryByText('Field notebook')).not.toBeInTheDocument();
  });
});
