import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { InitiatorPairingView } from './InitiatorPairingView';
import { fixtureExchange } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB';
const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const waiting = (overrides = {}) =>
  fixtureExchange({
    phase: 'awaiting-peer',
    offerPayload: PAYLOAD,
    sessionId: SESSION,
    ...overrides,
  });

describe('InitiatorPairingView', () => {
  it('shows the offer this device gathered', () => {
    renderWithProviders(<InitiatorPairingView exchange={waiting()} />);

    expect(screen.getByRole('img', { name: 'Pairing code from this device' })).toBeInTheDocument();
  });

  it('keeps the offer up while waiting for the reply', () => {
    // The other device is still reading this code; removing it the moment the
    // scanner appears would strand the user mid-exchange.
    renderWithProviders(<InitiatorPairingView exchange={waiting()} />);

    expect(screen.getByTestId('pairing-code-display')).toBeInTheDocument();
    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
  });

  it('renders nothing before an offer exists', () => {
    const { container } = renderWithProviders(
      <InitiatorPairingView exchange={fixtureExchange({ phase: 'awaiting-peer' })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('hands a complete scanned reply to the exchange', async () => {
    const user = userEvent.setup();
    const acceptAnswer = vi.fn();
    renderWithProviders(<InitiatorPairingView exchange={waiting({ acceptAnswer })} />);

    await user.click(screen.getByLabelText('Or paste the code text'));
    await user.paste(`W1:${SESSION}:1/1:${PAYLOAD}`);
    await user.click(screen.getByRole('button', { name: 'Use this code' }));

    expect(acceptAnswer).toHaveBeenCalledWith(PAYLOAD);
  });
});
