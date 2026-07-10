import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { CloudKeyConflictDialog } from './CloudKeyConflictDialog';

const render = (
  overrides: Partial<Parameters<typeof CloudKeyConflictDialog>[0]> = {},
) =>
  renderWithProviders(
    <CloudKeyConflictDialog
      open
      onOpenChange={() => undefined}
      onResolved={vi.fn()}
      onAdopt={vi.fn().mockResolvedValue(undefined)}
      onErase={vi.fn().mockResolvedValue(undefined)}
      {...overrides}
    />,
  );

describe('CloudKeyConflictDialog', () => {
  it('adopts the account key with the entered passphrase', async () => {
    const onAdopt = vi.fn().mockResolvedValue(undefined);
    const onResolved = vi.fn();
    render({ onAdopt, onResolved });

    await userEvent.type(
      screen.getByTestId('cloud-conflict-passphrase'),
      'their-pass',
    );
    await userEvent.click(screen.getByTestId('cloud-conflict-unlock'));

    expect(onAdopt).toHaveBeenCalledWith('their-pass');
    expect(onResolved).toHaveBeenCalled();
  });

  it('shows an inline error and stays open on the wrong passphrase', async () => {
    render({ onAdopt: vi.fn().mockRejectedValue(new Error('wrong')) });

    await userEvent.type(
      screen.getByTestId('cloud-conflict-passphrase'),
      'nope',
    );
    await userEvent.click(screen.getByTestId('cloud-conflict-unlock'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('cloud-conflict-dialog')).toBeInTheDocument();
  });

  it('keeps erase off the unlock surface, behind its own step', async () => {
    render({ onErase: vi.fn().mockResolvedValue(undefined) });
    expect(screen.queryByTestId('cloud-conflict-erase')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /don't have that passphrase/i }),
    );
    expect(screen.getByTestId('cloud-conflict-erase')).toBeInTheDocument();
  });

  it('arms the irreversible erase only after the confirmation word is typed', async () => {
    const onErase = vi.fn().mockResolvedValue(undefined);
    render({ onErase });
    await userEvent.click(
      screen.getByRole('button', { name: /don't have that passphrase/i }),
    );

    // The warning makes the irreversibility explicit and the button is disabled.
    expect(screen.getByTestId('cloud-conflict-erase-warning')).toHaveTextContent(
      /can't be undone/i,
    );
    const eraseBtn = screen.getByTestId('cloud-conflict-erase');
    expect(eraseBtn).toBeDisabled();

    // A near miss stays disabled; the exact word (case-insensitive) arms it.
    await userEvent.type(screen.getByTestId('cloud-conflict-erase-input'), 'ERAS');
    expect(eraseBtn).toBeDisabled();
    await userEvent.type(screen.getByTestId('cloud-conflict-erase-input'), 'E');
    expect(eraseBtn).toBeEnabled();

    await userEvent.click(eraseBtn);
    expect(onErase).toHaveBeenCalledTimes(1);
  });
});
