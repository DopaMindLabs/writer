import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { JoinerPairingView } from './JoinerPairingView';
import { fixtureExchange, fixturePeer } from './pairingExchange.fixture';

const PAYLOAD = 'eJwrSS0uUS9KLEjNyclXKMlIVUjOSC0qUShJLS7RS87PLShKLS4pSy0qBgB';
const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const answered = () =>
  fixtureExchange({
    phase: 'awaiting-confirmation',
    role: 'joiner',
    answerPayload: PAYLOAD,
    sessionId: SESSION,
    peer: fixturePeer(),
  });

describe('JoinerPairingView', () => {
  it('asks for the peer code while it has no reply of its own', () => {
    renderWithProviders(
      <JoinerPairingView exchange={fixtureExchange({ phase: 'awaiting-offer', role: 'joiner' })} />,
    );

    expect(screen.getByTestId('pairing-code-scanner')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the reply once it has one', () => {
    renderWithProviders(<JoinerPairingView exchange={answered()} />);

    expect(screen.getByRole('img', { name: 'Reply code from this device' })).toBeInTheDocument();
  });

  it('keeps the reply on screen beside the gate', () => {
    // The peer cannot show its digits until it has read this reply, so hiding
    // the reply behind the gate would deadlock the comparison.
    renderWithProviders(<JoinerPairingView exchange={answered()} />);

    expect(screen.getByTestId('pairing-verification-code')).toHaveTextContent('048213');
    expect(screen.getByRole('img', { name: 'Reply code from this device' })).toBeInTheDocument();
  });

  it('says what the user should do with the reply', () => {
    renderWithProviders(<JoinerPairingView exchange={answered()} />);

    expect(screen.getByTestId('pairing-answer-hint')).toHaveTextContent(
      'Now show this reply code to the other device.',
    );
  });

  it('holds the gate closed until the exchange has proved a peer', () => {
    renderWithProviders(<JoinerPairingView exchange={{ ...answered(), peer: null }} />);

    expect(screen.queryByTestId('pairing-verification')).not.toBeInTheDocument();
  });

  it('hands a complete scanned payload to the exchange', async () => {
    const user = userEvent.setup();
    const submitOffer = vi.fn();
    renderWithProviders(
      <JoinerPairingView
        exchange={fixtureExchange({ phase: 'awaiting-offer', role: 'joiner', submitOffer })}
      />,
    );

    await user.click(screen.getByLabelText('Or paste the code text'));
    await user.paste(`W1:${SESSION}:1/1:${PAYLOAD}`);
    await user.click(screen.getByRole('button', { name: 'Use this code' }));

    expect(submitOffer).toHaveBeenCalledWith(PAYLOAD);
  });
});
