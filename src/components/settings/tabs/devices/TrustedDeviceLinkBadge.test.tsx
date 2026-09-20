import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { TrustedDeviceLinkBadge } from './TrustedDeviceLinkBadge';

describe('TrustedDeviceLinkBadge', () => {
  it('states the resting state rather than leaving a row blank', () => {
    // The ordinary case: sessions survive no reload, so most visits have no link
    // to any device. Saying nothing left a paired device looking ready to sync
    // when nothing could reach it.
    renderWithProviders(<TrustedDeviceLinkBadge />);

    expect(screen.getByTestId('device-link-idle')).toHaveTextContent('Not connected');
  });

  it('marks a connected device', () => {
    renderWithProviders(<TrustedDeviceLinkBadge state="connected" />);

    expect(screen.getByTestId('device-link-connected')).toHaveTextContent('Connected');
  });

  it('marks a link still coming up', () => {
    renderWithProviders(<TrustedDeviceLinkBadge state="connecting" />);

    expect(screen.getByTestId('device-link-connecting')).toHaveTextContent('Connecting');
  });

  it('tells a link that stopped apart from one that never started', () => {
    // Same fact, different news: one is a reopened page, the other is work that
    // was crossing and is not any more.
    renderWithProviders(<TrustedDeviceLinkBadge state="dropped" />);

    expect(screen.getByTestId('device-link-dropped')).toHaveTextContent('Disconnected');
  });
});
