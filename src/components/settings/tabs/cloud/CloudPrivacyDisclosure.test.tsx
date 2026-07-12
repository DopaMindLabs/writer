import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudPrivacyDisclosure } from './CloudPrivacyDisclosure';

describe('CloudPrivacyDisclosure', () => {
  it('is a note stating what the server can and cannot see', () => {
    renderWithProviders(<CloudPrivacyDisclosure />);
    const note = screen.getByTestId('cloud-privacy-disclosure');
    expect(note).toHaveAttribute('role', 'note');
    // The encryption assurance.
    expect(note).toHaveTextContent(/encrypted on this device before upload/i);
    // Every server-visible item is disclosed.
    expect(note).toHaveTextContent(/Record identifiers/i);
    expect(note).toHaveTextContent(/When records were created and changed/i);
    expect(note).toHaveTextContent(/Note kinds, and citation keys and years/i);
    expect(note).toHaveTextContent(/email address you sign in with/i);
    expect(note).toHaveTextContent(/Sync timing and your IP address/i);
    expect(note).toHaveTextContent(/invite-only/i);
  });
});
