import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { PdfCardUrlInput } from './PdfCardUrlInput';

describe('PdfCardUrlInput', () => {
  it('submits the trimmed url value', () => {
    const onSubmit = vi.fn();
    renderWithProviders(
      <PdfCardUrlInput
        initialValue=""
        busy={false}
        onSubmit={onSubmit}
        testIdPrefix="t"
      />,
    );
    fireEvent.change(screen.getByTestId('t-field'), {
      target: { value: '  https://x.test/a.pdf  ' },
    });
    fireEvent.click(screen.getByTestId('t-submit'));
    expect(onSubmit).toHaveBeenCalledWith('https://x.test/a.pdf');
  });

  it('disables submit when the value is empty', () => {
    renderWithProviders(
      <PdfCardUrlInput
        initialValue=""
        busy={false}
        onSubmit={vi.fn()}
        testIdPrefix="t"
      />,
    );
    expect(screen.getByTestId('t-submit')).toBeDisabled();
  });

  it('cancels on Escape when a cancel handler is given', () => {
    const onCancel = vi.fn();
    renderWithProviders(
      <PdfCardUrlInput
        initialValue="https://x.test/a.pdf"
        busy={false}
        onSubmit={vi.fn()}
        onCancel={onCancel}
        testIdPrefix="t"
      />,
    );
    fireEvent.keyDown(screen.getByTestId('t-field'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
