import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { MAX_QR_CHUNK_BYTES, MAX_QR_PARTS } from 'writer-sync/pairing';
import { PairingCodeDisplay } from './PairingCodeDisplay';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

/** A payload of exactly `parts` symbols, so paging is exercised honestly. */
const payloadOf = (parts: number): string => 'a'.repeat(MAX_QR_CHUNK_BYTES * parts);

describe('PairingCodeDisplay', () => {
  it('renders the code with an accessible name saying what it is for', () => {
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(1)} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.getByRole('img', { name: 'Pairing code from this device' })).toBeInTheDocument();
  });

  it('names an answer differently from an offer', () => {
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(1)} sessionId={SESSION} kind="answer" />,
    );

    expect(screen.getByRole('img', { name: 'Reply code from this device' })).toBeInTheDocument();
  });

  it('offers the payload as selectable text so no camera is needed', () => {
    const payload = payloadOf(1);

    renderWithProviders(
      <PairingCodeDisplay payload={payload} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.getByTestId('pairing-code-payload')).toHaveValue(payload);
  });

  it('associates the payload field with its label', () => {
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(1)} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.getByLabelText('Or copy this text to the other device')).toBe(
      screen.getByTestId('pairing-code-payload'),
    );
  });

  it('shows no pager when the payload fits one symbol', () => {
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(1)} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('pages through a payload that needs several symbols', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(3)} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Symbol 1 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('status')).toHaveTextContent('Symbol 2 of 3');
  });

  it('stops at the first and last symbol', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PairingCodeDisplay payload={payloadOf(2)} sessionId={SESSION} kind="offer" />,
    );

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('reports a payload that exceeds the symbol ceiling rather than rendering nothing', () => {
    renderWithProviders(
      <PairingCodeDisplay
        payload={payloadOf(MAX_QR_PARTS + 1)}
        sessionId={SESSION}
        kind="offer"
      />,
    );

    expect(screen.getByTestId('pairing-code-too-large')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
