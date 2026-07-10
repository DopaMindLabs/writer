import userEvent from '@testing-library/user-event';
import { renderWithProviders, renderAtRoute, screen } from '@/test/test-utils';
import { TemplatesNotice } from './TemplatesNotice';

describe('TemplatesNotice', () => {
  it('renders nothing when unlocked with no submit error', () => {
    const { container } = renderWithProviders(
      <TemplatesNotice lockReason="none" submitError={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('warns and offers the account action under a key mismatch', () => {
    renderWithProviders(<TemplatesNotice lockReason="mismatch" submitError={null} />);
    const banner = screen.getByTestId('templates-lock-banner');
    expect(banner).toHaveTextContent(/encryption key has changed/i);
    expect(screen.getByRole('button', { name: /open account settings/i })).toBeInTheDocument();
  });

  it('warns with the keyless copy while signed in without a key', () => {
    renderWithProviders(<TemplatesNotice lockReason="keyless" submitError={null} />);
    expect(screen.getByTestId('templates-lock-banner')).toHaveTextContent(
      /signed in without an encryption key/i,
    );
  });

  it('shows the locked warning for a caught write-lock submit failure', () => {
    renderWithProviders(<TemplatesNotice lockReason="none" submitError="locked" />);
    expect(screen.getByTestId('templates-lock-banner')).toHaveTextContent(
      /encryption is locked on this device/i,
    );
  });

  it('shows an error banner without an action for a generic failure', () => {
    renderWithProviders(<TemplatesNotice lockReason="none" submitError="failed" />);
    expect(screen.getByTestId('templates-error-banner')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByRole('button', { name: /open account settings/i })).toBeNull();
  });

  it('prefers a live lock reason over a caught submit error', () => {
    renderWithProviders(<TemplatesNotice lockReason="mismatch" submitError="failed" />);
    expect(screen.getByTestId('templates-lock-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('templates-error-banner')).toBeNull();
  });

  it('navigates to the account settings tab from the action', async () => {
    renderAtRoute(<TemplatesNotice lockReason="keyless" submitError={null} />, {
      path: '/new',
      initialEntries: ['/new'],
    });
    await userEvent.click(screen.getByRole('button', { name: /open account settings/i }));
    expect(await screen.findByTestId('catch-all')).toBeInTheDocument();
  });
});
