import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';

describe('CloudPrivacyDisclosure', () => {
  it('is a note stating what the server can and cannot see', () => {
    renderWithProviders(<CloudPrivacyDisclosure />);
    const note = screen.getByTestId('cloud-privacy-disclosure');
    expect(note).toHaveAttribute('role', 'note');
    // The encryption assurance.
    expect(note).toHaveTextContent(/encrypted on this device before they are uploaded/i);
    // Every server-visible item is disclosed.
    expect(note).toHaveTextContent(/Record identifiers/i);
    expect(note).toHaveTextContent(/When records were created and changed/i);
    expect(note).toHaveTextContent(/Note kinds, and citation keys and years/i);
    expect(note).toHaveTextContent(/email address you sign in with/i);
    expect(note).toHaveTextContent(/Sync timing and your IP address/i);
  });

  it('labels the exposed list, so it cannot read as more reassurance', () => {
    renderWithProviders(<CloudPrivacyDisclosure />);
    const note = screen.getByTestId('cloud-privacy-disclosure');

    // The failure this guards against is a reader taking the bullet list as
    // things the server is kept from seeing, when it is the opposite.
    expect(note).toHaveTextContent(/What it never sees/i);
    expect(note).toHaveTextContent(/What it does see/i);
  });

  it('makes no claim about how sign-in is granted', () => {
    renderWithProviders(<CloudPrivacyDisclosure />);

    expect(screen.getByTestId('cloud-privacy-disclosure')).not.toHaveTextContent(
      /invite/i,
    );
  });
});
