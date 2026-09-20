import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingReplyStep } from './PairingReplyStep';
import { fixtureExchange, fixturePeer } from './pairingExchange.fixture';

/**
 * The step is two presses away from losing an exchange, so what matters is that
 * neither press is reachable by reflex: the code appears only when it is asked
 * for, and the screen that follows it can be left again.
 */

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const answered = () =>
  fixtureExchange({
    phase: 'awaiting-confirmation',
    role: 'joiner',
    answerPayload: 'a'.repeat(64),
    sessionId: SESSION,
    peer: fixturePeer(),
  });

describe('PairingReplyStep', () => {
  it('renders nothing until this device has an answer to hand back', () => {
    renderWithProviders(<PairingReplyStep exchange={fixtureExchange({ role: 'joiner' })} />);

    expect(screen.queryByTestId('pairing-reply-step')).not.toBeInTheDocument();
  });

  it('holds the code back until it is asked for', () => {
    renderWithProviders(<PairingReplyStep exchange={answered()} />);

    // The screen arrives under the finger that finished the scan. A code shown
    // here shares its screen with the action that dismisses it, so a reflex
    // press loses a code the user never saw.
    expect(screen.getByTestId('pairing-reply-step')).toBeInTheDocument();
    expect(screen.queryByTestId('pairing-code-display')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reveal the code for your other device' }),
    ).toBeInTheDocument();
  });

  it('shows the code, and only then the way on, once asked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PairingReplyStep exchange={answered()} />);

    await user.click(screen.getByTestId('pairing-reply-reveal'));

    expect(
      await screen.findByRole('img', { name: 'Reply code from this device' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('pairing-reply-shown')).toBeInTheDocument();
  });

  it('moves on to the digits when the user says the code was taken', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PairingReplyStep exchange={answered()} />);

    await user.click(screen.getByTestId('pairing-reply-reveal'));
    await user.click(screen.getByTestId('pairing-reply-shown'));

    expect(screen.getByTestId('pairing-verification-code')).toHaveTextContent('048213');
  });

  it('goes back to the code from the digits, without re-minting the reply', async () => {
    const user = userEvent.setup();
    const exchange = answered();
    renderWithProviders(<PairingReplyStep exchange={exchange} />);
    await user.click(screen.getByTestId('pairing-reply-reveal'));
    await user.click(screen.getByTestId('pairing-reply-shown'));

    await user.click(screen.getByTestId('pairing-reply-show-code'));

    // The same answer, shown again: re-minting it would re-drive signalling and
    // change the digits the peer is already comparing against.
    expect(screen.getByTestId('pairing-code-payload')).toHaveValue(
      `W1:${SESSION}:1/1:${exchange.answerPayload ?? ''}`,
    );
    expect(screen.queryByTestId('pairing-verification-code')).not.toBeInTheDocument();
  });

  it('confirms only when the user declares the digits match', async () => {
    const user = userEvent.setup();
    const confirm = vi.fn();
    renderWithProviders(<PairingReplyStep exchange={{ ...answered(), confirm }} />);

    await user.click(screen.getByTestId('pairing-reply-reveal'));
    await user.click(screen.getByTestId('pairing-reply-shown'));
    expect(confirm).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(confirm).toHaveBeenCalledOnce();
  });
});
