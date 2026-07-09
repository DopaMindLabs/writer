import { vi, afterEach } from 'vitest';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CLOUD_FLAG_KEY } from '@/lib/cloud/flag';
import { CloudSection } from './CloudSection';

describe('CloudSection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('renders nothing when the gates are off (default experience)', () => {
    renderWithProviders(<CloudSection />);
    expect(screen.queryByTestId('cloud-section')).toBeNull();
  });

  it('renders the section, keyless, when both gates are on', () => {
    vi.stubEnv('VITE_DEXIE_CLOUD_URL', 'https://x.dexie.cloud');
    localStorage.setItem(CLOUD_FLAG_KEY, 'on');
    renderWithProviders(<CloudSection />);
    expect(screen.getByTestId('cloud-section')).toBeInTheDocument();
    // Privacy disclosure always shown; a clean device may sign in before a key
    // exists (the guard turns back only a device with unencrypted writing).
    expect(screen.getByTestId('cloud-privacy-disclosure')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-setup')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-sign-in')).toBeEnabled();
  });
});
