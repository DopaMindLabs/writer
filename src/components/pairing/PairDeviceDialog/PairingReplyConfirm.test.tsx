import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { PairingReplyConfirm } from './PairingReplyConfirm';

const CODE = '048213';

describe('PairingReplyConfirm', () => {
  it('shows the digits and both ways on', () => {
    renderWithProviders(
      <PairingReplyConfirm code={CODE} onConfirm={vi.fn()} onShowCode={vi.fn()} />,
    );

    expect(screen.getByTestId('pairing-verification-code')).toHaveTextContent(CODE);
    expect(screen.getByRole('button', { name: 'The codes match' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show the code again' })).toBeInTheDocument();
  });

  it('confirms only on the explicit declaration that they match', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(
      <PairingReplyConfirm code={CODE} onConfirm={onConfirm} onShowCode={vi.fn()} />,
    );

    await user.click(screen.getByTestId('pairing-verification-confirm'));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('asks for the reply back without confirming anything', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onShowCode = vi.fn();
    renderWithProviders(
      <PairingReplyConfirm code={CODE} onConfirm={onConfirm} onShowCode={onShowCode} />,
    );

    await user.click(screen.getByTestId('pairing-reply-show-code'));

    // The escape hatch from an early press: it must not spend the single-use
    // confirmation on its way back.
    expect(onShowCode).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
