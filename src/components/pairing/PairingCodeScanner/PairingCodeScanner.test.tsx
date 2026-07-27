import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { splitIntoQrParts } from 'writer-sync/pairing';
import { PairingCodeScanner } from './PairingCodeScanner';

const SESSION = 'c2Vzc2lvbi1pZC0xMjM0';

const symbolsFor = (text: string, sessionId = SESSION): string[] =>
  splitIntoQrParts({ sessionId, text });

/**
 * Paste is the camera-free path, and the one a test can drive honestly. No
 * clearing between symbols: the field empties itself on submit, and relying on
 * that here is what keeps the regression visible if it ever stops.
 */
const paste = async (symbol: string): Promise<void> => {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Or paste the code text'));
  await user.paste(symbol);
  await user.click(screen.getByRole('button', { name: 'Use this code' }));
};

describe('PairingCodeScanner', () => {
  it('hands on a single-symbol payload', async () => {
    const onPayload = vi.fn<(payload: string) => void>();
    renderWithProviders(<PairingCodeScanner onPayload={onPayload} />);

    await paste(symbolsFor('short-payload')[0]);

    expect(onPayload).toHaveBeenCalledWith('short-payload');
  });

  it('withholds a multi-symbol payload until the set is complete', async () => {
    const text = 'a'.repeat(2500);
    const onPayload = vi.fn<(payload: string) => void>();
    renderWithProviders(<PairingCodeScanner onPayload={onPayload} />);
    const symbols = symbolsFor(text);

    await paste(symbols[0]);
    expect(onPayload).not.toHaveBeenCalled();

    await paste(symbols[1]);
    await paste(symbols[2]);

    expect(onPayload).toHaveBeenCalledExactlyOnceWith(text);
  });

  it('names the symbols it still needs', async () => {
    renderWithProviders(<PairingCodeScanner onPayload={vi.fn()} />);

    await paste(symbolsFor('b'.repeat(2500))[1]);

    expect(screen.getByTestId('pairing-scan-progress')).toHaveTextContent(
      'Read 1 of 3 symbols. Still needed: 1, 3.',
    );
  });

  it('reports an unreadable symbol without echoing it', async () => {
    renderWithProviders(<PairingCodeScanner onPayload={vi.fn()} />);

    await paste('definitely-not-a-pairing-symbol');

    const problem = screen.getByTestId('pairing-scan-problem');
    expect(problem).toBeInTheDocument();
    expect(problem).not.toHaveTextContent('definitely-not-a-pairing-symbol');
  });

  it('announces a refusal assertively', async () => {
    renderWithProviders(<PairingCodeScanner onPayload={vi.fn()} />);

    await paste('nonsense');

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('refuses a symbol from a different pairing attempt', async () => {
    const onPayload = vi.fn<(payload: string) => void>();
    renderWithProviders(<PairingCodeScanner onPayload={onPayload} />);

    await paste(symbolsFor('c'.repeat(2500))[0]);
    await paste(symbolsFor('d'.repeat(2500), 'YW5vdGhlci1zZXNzaW9u')[0]);

    expect(screen.getByTestId('pairing-scan-problem')).toBeInTheDocument();
    expect(onPayload).not.toHaveBeenCalled();
  });

  it('clears the problem once a good symbol arrives', async () => {
    renderWithProviders(<PairingCodeScanner onPayload={vi.fn()} />);

    await paste('nonsense');
    await paste(symbolsFor('e'.repeat(2500))[0]);

    expect(screen.queryByTestId('pairing-scan-problem')).not.toBeInTheDocument();
  });

  it('shows no progress before anything has been scanned', () => {
    renderWithProviders(<PairingCodeScanner onPayload={vi.fn()} />);

    expect(screen.queryByTestId('pairing-scan-progress')).not.toBeInTheDocument();
  });
});
