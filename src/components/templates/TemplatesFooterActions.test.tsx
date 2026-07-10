import { renderWithProviders, screen } from '@/test/test-utils';
import { TemplatesFooterActions } from './TemplatesFooterActions';

describe('TemplatesFooterActions', () => {
  it('shows the submit label and enables submit when it can submit', () => {
    renderWithProviders(
      <TemplatesFooterActions submitting={false} canSubmit submitLabel="Enter Blank" />,
    );
    const submit = screen.getByTestId('templates-submit');
    expect(submit).toHaveTextContent('Enter Blank');
    expect(submit).toBeEnabled();
  });

  it('disables submit when it cannot submit', () => {
    renderWithProviders(
      <TemplatesFooterActions submitting={false} canSubmit={false} submitLabel="Enter Blank" />,
    );
    expect(screen.getByTestId('templates-submit')).toBeDisabled();
  });

  it('swaps to the creating label and disables submit while submitting', () => {
    renderWithProviders(
      <TemplatesFooterActions submitting canSubmit submitLabel="Enter Blank" />,
    );
    const submit = screen.getByTestId('templates-submit');
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveTextContent('Enter Blank');
  });
});
