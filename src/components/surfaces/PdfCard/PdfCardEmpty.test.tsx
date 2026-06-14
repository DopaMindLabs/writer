import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardEmpty } from './PdfCardEmpty';

describe('PdfCardEmpty', () => {
  it('opens the picker when activated', () => {
    const onPick = vi.fn();
    renderWithProviders(<PdfCardEmpty noteId="n1" onPick={onPick} />);
    const button = screen.getByTestId('brain-note-n1-pdf-empty');
    expect(button).toHaveTextContent('Select PDF');
    fireEvent.pointerDown(button);
    fireEvent.click(button);
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
