import { render, screen } from '@/test/test-utils';
import { NotebookProcessingStatus } from './NotebookProcessingStatus';

describe('NotebookProcessingStatus', () => {
  it('announces active page preparation', () => {
    render(<NotebookProcessingStatus processing error={null} />);
    expect(screen.getByText('Preparing notebook pages…')).toBeInTheDocument();
  });

  it('shows the processing error instead of the progress message', () => {
    render(<NotebookProcessingStatus processing error="Decode failed" />);
    expect(screen.getByText('Decode failed')).toBeInTheDocument();
    expect(screen.queryByText('Preparing notebook pages…')).not.toBeInTheDocument();
  });

  it('renders nothing when idle', () => {
    const { container } = render(<NotebookProcessingStatus processing={false} error={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
