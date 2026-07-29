import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/test/test-utils';
import { RecoveryCodeDialog } from './RecoveryCodeDialog';

describe('RecoveryCodeDialog', () => {
  it('shows the code and refuses to finish until it is confirmed stored', async () => {
    const onDone = vi.fn();
    renderWithProviders(<RecoveryCodeDialog code="ABCD-EFGH-JKLM" open onDone={onDone} />);
    expect(await screen.findByTestId('recovery-code')).toHaveTextContent('ABCD-EFGH-JKLM');

    const done = screen.getByTestId('recovery-done');
    expect(done).toBeDisabled();
    await userEvent.click(done);
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('recovery-confirm'));
    expect(done).toBeEnabled();
    await userEvent.click(done);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
