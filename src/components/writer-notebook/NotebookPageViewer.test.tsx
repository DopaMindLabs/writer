import { serialiseSafeVectorDocument } from 'writer-notebook/core';
import { render, screen } from '@/test/test-utils';
import { NotebookPageViewer } from './NotebookPageViewer';

const image = new Blob(['page'], { type: 'image/webp' });

describe('NotebookPageViewer', () => {
  it('renders the original page with a page-level accessible name', () => {
    render(<NotebookPageViewer blob={image} pageNumber={3} rotation={90} />);
    const page = screen.getByRole('img', { name: 'Page 3' });
    expect(page).toHaveStyle({ transform: 'rotate(90deg)' });
  });

  it('defaults to Vector when a safe-vector asset validates and keeps Original available', async () => {
    const vectorBlob = serialiseSafeVectorDocument({
      version: 1,
      width: 100,
      height: 200,
      paths: [{ d: 'M0 0L10 10', fill: '#111' }],
    });
    render(<NotebookPageViewer blob={image} vectorBlob={vectorBlob} pageNumber={1} rotation={0} />);
    expect(await screen.findByRole('img', { name: 'Page 1 vector' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Original' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vector' })).toBeInTheDocument();
  });
});
