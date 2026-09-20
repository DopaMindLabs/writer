import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingReplyCode } from './PairingReplyCode';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';
const PAYLOAD = 'a'.repeat(64);

describe('PairingReplyCode', () => {
  it('shows the reply named as a reply, not as an offer', () => {
    renderWithProviders(
      <PairingReplyCode payload={PAYLOAD} sessionId={SESSION} onHandOver={vi.fn()} />,
    );

    expect(
      screen.getByRole('img', { name: 'Reply code from this device' }),
    ).toBeInTheDocument();
  });

  it('carries the symbol as text too, so the peer needs no camera', () => {
    renderWithProviders(
      <PairingReplyCode payload={PAYLOAD} sessionId={SESSION} onHandOver={vi.fn()} />,
    );

    expect(screen.getByTestId('pairing-code-payload')).toHaveValue(
      `W1:${SESSION}:1/1:${PAYLOAD}`,
    );
  });

  it('reports the hand-over when the user says the code was taken', async () => {
    const user = userEvent.setup();
    const onHandOver = vi.fn();
    renderWithProviders(
      <PairingReplyCode payload={PAYLOAD} sessionId={SESSION} onHandOver={onHandOver} />,
    );

    await user.click(screen.getByTestId('pairing-reply-shown'));

    // Nothing reaches this device when the peer reads the code, so the user is
    // the only possible trigger.
    expect(onHandOver).toHaveBeenCalledOnce();
  });
});
