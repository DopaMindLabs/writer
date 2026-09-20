import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingOfferCode } from './PairingOfferCode';
import { fixtureExchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB';

const gathered = () =>
  fixtureExchange({
    phase: 'awaiting-peer',
    offerPayload: PAYLOAD,
    sessionId: 'c2Vzc2lvbi1pZC0xMjM0',
  });

describe('PairingOfferCode', () => {
  it('shows the code for the other device to read', () => {
    renderWithProviders(<PairingOfferCode exchange={gathered()} onScanReply={vi.fn()} />);

    expect(
      screen.getByRole('img', { name: 'Pairing code from this device' }),
    ).toBeInTheDocument();
  });

  it('names the wait when the code is not gathered yet', () => {
    renderWithProviders(<PairingOfferCode exchange={fixtureExchange()} onScanReply={vi.fn()} />);

    // Chosen before gathering finished: an empty frame would look like a fault.
    expect(screen.getByTestId('pair-device-gathering')).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Pairing code from this device' }),
    ).not.toBeInTheDocument();
  });

  it('moves on only when the user says the code was read', async () => {
    const user = userEvent.setup();
    const onScanReply = vi.fn();
    renderWithProviders(<PairingOfferCode exchange={gathered()} onScanReply={onScanReply} />);

    // Nothing arrives on this device when its peer reads the code, so the user
    // is the only possible trigger for the next step.
    expect(onScanReply).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: "It's been scanned — scan the reply" }));

    expect(onScanReply).toHaveBeenCalledOnce();
  });
});
