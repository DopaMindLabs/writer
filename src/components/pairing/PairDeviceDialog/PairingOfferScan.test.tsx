import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingOfferScan } from './PairingOfferScan';
import { fixtureExchange } from './pairingExchange.fixture';

const scanning = () =>
  fixtureExchange({ phase: 'awaiting-peer', sessionId: 'c2Vzc2lvbi1pZC0xMjM0' });

describe('PairingOfferScan', () => {
  it('offers a way to read the other device without showing a code beside it', () => {
    renderWithProviders(<PairingOfferScan exchange={scanning()} onShowCode={vi.fn()} />);

    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Pairing code from this device' }),
    ).not.toBeInTheDocument();
  });

  it('says so when the device was pointed at its own screen', () => {
    renderWithProviders(
      <PairingOfferScan
        exchange={{ ...scanning(), ownCodeScanned: true }}
        onShowCode={vi.fn()}
      />,
    );

    expect(screen.getByTestId('pairing-own-code')).toBeInTheDocument();
    // The fix is another scan, so the scanner stays where it is.
    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
  });

  it('leads back to the code this device can show', async () => {
    const user = userEvent.setup();
    const onShowCode = vi.fn();
    renderWithProviders(<PairingOfferScan exchange={scanning()} onShowCode={onShowCode} />);

    await user.click(screen.getByTestId('pairing-show-code'));

    expect(onShowCode).toHaveBeenCalledOnce();
  });
});
