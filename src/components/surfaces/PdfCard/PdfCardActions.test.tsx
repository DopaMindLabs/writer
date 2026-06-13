import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardActions } from './PdfCardActions';

const setup = (overrides: Partial<Parameters<typeof PdfCardActions>[0]> = {}) => {
  const props = {
    noteId: 'n1',
    busy: false,
    onOpenBeside: vi.fn(),
    onEditSource: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<PdfCardActions {...props} />);
  return props;
};

describe('PdfCardActions', () => {
  it('fires the open-beside callback', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('brain-note-n1-open-beside'));
    expect(props.onOpenBeside).toHaveBeenCalledTimes(1);
  });

  it('fires edit-source and refresh callbacks', () => {
    const props = setup();
    fireEvent.click(screen.getByTestId('brain-note-n1-edit-source'));
    fireEvent.click(screen.getByTestId('brain-note-n1-refresh'));
    expect(props.onEditSource).toHaveBeenCalledTimes(1);
    expect(props.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh while busy', () => {
    setup({ busy: true });
    expect(screen.getByTestId('brain-note-n1-refresh')).toBeDisabled();
  });

  it('hides refresh for a library source (no onRefresh)', () => {
    setup({ onRefresh: undefined });
    expect(screen.queryByTestId('brain-note-n1-refresh')).not.toBeInTheDocument();
  });
});
