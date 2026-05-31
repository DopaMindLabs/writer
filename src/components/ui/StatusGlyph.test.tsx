import { render, screen } from '@/test/test-utils';
import { StatusGlyph } from './StatusGlyph';

describe('StatusGlyph', () => {
  it('renders the label with the role colour and an icon', () => {
    const { container } = render(<StatusGlyph kind="error">failed</StatusGlyph>);
    const label = screen.getByText('failed');
    expect(label.parentElement).toHaveClass('text-danger');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses the success token for the success role', () => {
    render(<StatusGlyph kind="success">saved</StatusGlyph>);
    expect(screen.getByText('saved').parentElement).toHaveClass('text-success');
  });

  it('renders sans when mono is false', () => {
    render(
      <StatusGlyph kind="info" mono={false}>
        noticed
      </StatusGlyph>,
    );
    expect(screen.getByText('noticed').parentElement).toHaveClass('font-sans');
  });

  it('forwards arbitrary attributes (e.g. role="alert")', () => {
    render(
      <StatusGlyph kind="error" role="alert">
        boom
      </StatusGlyph>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  describe('snapshot', () => {
    it('should match the snapshot across kinds and mono states', () => {
      const { container } = render(
        <div>
          <StatusGlyph kind="error">failed</StatusGlyph>
          <StatusGlyph kind="warning">warning</StatusGlyph>
          <StatusGlyph kind="success">saved</StatusGlyph>
          <StatusGlyph kind="info">noticed</StatusGlyph>
          <StatusGlyph kind="info" mono={false}>
            sans label
          </StatusGlyph>
        </div>,
      );
      expect(container).toMatchSnapshot();
    });
  });
});
