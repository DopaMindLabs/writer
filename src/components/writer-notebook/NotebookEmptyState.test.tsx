import { render, screen } from '@/test/test-utils';
import { NotebookEmptyState } from './NotebookEmptyState';

describe('NotebookEmptyState', () => {
  it('explains how to add the first notebook page', () => {
    render(<NotebookEmptyState />);
    expect(screen.getByText('No pages yet')).toBeInTheDocument();
    expect(screen.getByText(/Add a photo or choose several images/)).toBeInTheDocument();
  });
});
